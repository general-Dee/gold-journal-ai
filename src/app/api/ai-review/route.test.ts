import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Trade } from "@/lib/types";

const verifyIdToken = vi.fn();
const runTransaction = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({
    collection: () => ({ doc: () => ({}) }),
    runTransaction: (cb: unknown) => runTransaction(cb)
  })
}));

const messagesCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: (...args: unknown[]) => messagesCreate(...args) };
  }
}));

const { POST } = await import("./route");

const ORIGINAL_ENV = { ...process.env };

function withAdminEnv() {
  process.env.FIREBASE_ADMIN_PROJECT_ID = "proj";
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "sa@proj.iam.gserviceaccount.com";
  process.env.FIREBASE_ADMIN_PRIVATE_KEY = "key";
}

function validTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "t1",
    date: "2026-08-20",
    direction: "Long",
    entryPrice: 2400,
    exitPrice: 2410,
    stopLoss: 2395,
    lotSize: 0.1,
    session: "London",
    setupType: "Trend Continuation",
    mistakeTag: "None",
    riskAmount: 50,
    pnl: 100,
    rMultiple: 2,
    emotionBefore: 3,
    emotionDuring: 3,
    emotionAfter: 3,
    notes: "account #1234 secret notes",
    createdAt: Date.now(),
    ...overrides
  };
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/ai-review", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/ai-review", () => {
  it("returns a config message with 200 when Firebase Admin env vars are missing", async () => {
    const res = await POST(makeRequest({ trades: [validTrade()] }, { authorization: "Bearer x" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary).toMatch(/FIREBASE_ADMIN/);
  });

  it("returns 401 when no bearer token is supplied", async () => {
    withAdminEnv();

    const res = await POST(makeRequest({ trades: [validTrade()] }));

    expect(res.status).toBe(401);
  });

  it("returns 401 when the token fails verification", async () => {
    withAdminEnv();
    verifyIdToken.mockRejectedValue(new Error("bad token"));

    const res = await POST(makeRequest({ trades: [validTrade()] }, { authorization: "Bearer bad" }));

    expect(res.status).toBe(401);
  });

  it("returns 429 when the caller is over the rate limit", async () => {
    withAdminEnv();
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(false);

    const res = await POST(makeRequest({ trades: [validTrade()] }, { authorization: "Bearer ok" }));

    expect(res.status).toBe(429);
  });

  it("returns 200 with a prompt message when no trades are supplied", async () => {
    withAdminEnv();
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);

    const res = await POST(makeRequest({ trades: [] }, { authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary).toMatch(/Log a few trades/);
  });

  it("returns 400 when trade data does not match the schema", async () => {
    withAdminEnv();
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);

    const res = await POST(
      makeRequest({ trades: [{ ...validTrade(), direction: "Sideways" }] }, { authorization: "Bearer ok" })
    );

    expect(res.status).toBe(400);
  });

  it("returns a config message with 200 when ANTHROPIC_API_KEY is missing", async () => {
    withAdminEnv();
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);

    const res = await POST(makeRequest({ trades: [validTrade()] }, { authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns the model summary and sends only pattern-relevant, non-identifying fields to Anthropic", async () => {
    withAdminEnv();
    process.env.ANTHROPIC_API_KEY = "sk-test";
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);
    messagesCreate.mockResolvedValue({ content: [{ type: "text", text: "You trade best in London." }] });

    const trade = validTrade();
    const res = await POST(makeRequest({ trades: [trade] }, { authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary).toBe("You trade best in London.");

    expect(messagesCreate).toHaveBeenCalledTimes(1);
    const call = messagesCreate.mock.calls[0][0];
    const sentTrades = JSON.parse(call.messages[0].content.split("\n\n")[1]) as Record<string, unknown>[];
    expect(sentTrades).toHaveLength(1);
    expect(Object.keys(sentTrades[0]).sort()).toEqual(
      [
        "date",
        "direction",
        "session",
        "setupType",
        "mistakeTag",
        "rMultiple",
        "pnl",
        "emotionBefore",
        "emotionDuring",
        "emotionAfter"
      ].sort()
    );
    expect(sentTrades[0]).not.toHaveProperty("id");
    expect(sentTrades[0]).not.toHaveProperty("notes");
  });
});
