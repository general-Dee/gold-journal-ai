import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const runTransaction = vi.fn();
const batchSet = vi.fn();
const batchCommit = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({
    collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }),
    runTransaction: (cb: unknown) => runTransaction(cb),
    batch: () => ({ set: batchSet, commit: batchCommit })
  })
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const { POST } = await import("./route");

const ORIGINAL_ENV = { ...process.env };

function withAdminEnv() {
  process.env.FIREBASE_ADMIN_PROJECT_ID = "proj";
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "sa@proj.iam.gserviceaccount.com";
  process.env.FIREBASE_ADMIN_PRIVATE_KEY = "key";
}

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/economic-calendar/sync", {
    method: "POST",
    headers
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/economic-calendar/sync", () => {
  it("returns a config message with 200 when Firebase Admin env vars are missing", async () => {
    const res = await POST(makeRequest({ authorization: "Bearer x" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/FIREBASE_ADMIN/);
  });

  it("returns 401 when no bearer token is supplied", async () => {
    withAdminEnv();

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
  });

  it("returns 401 when the token fails verification", async () => {
    withAdminEnv();
    verifyIdToken.mockRejectedValue(new Error("bad token"));

    const res = await POST(makeRequest({ authorization: "Bearer bad" }));

    expect(res.status).toBe(401);
  });

  it("returns 429 when the caller is over the rate limit", async () => {
    withAdminEnv();
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(false);

    const res = await POST(makeRequest({ authorization: "Bearer ok" }));

    expect(res.status).toBe(429);
  });

  it("returns a config message with 200 when FINNHUB_API_KEY is missing", async () => {
    withAdminEnv();
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);

    const res = await POST(makeRequest({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/FINNHUB_API_KEY/);
  });

  it("returns a message with 200 when Finnhub returns a non-ok response", async () => {
    withAdminEnv();
    process.env.FINNHUB_API_KEY = "token";
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    const res = await POST(makeRequest({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/403/);
  });

  it("filters to US medium/high impact events and writes them via a batch", async () => {
    withAdminEnv();
    process.env.FINNHUB_API_KEY = "token";
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);
    batchCommit.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        economicCalendar: [
          { country: "US", event: "CPI", impact: "high", time: "2026-10-01 12:30:00", estimate: 3.1, prev: 3.0, unit: "%" },
          { country: "US", event: "Low Impact Thing", impact: "low", time: "2026-10-02 08:00:00" },
          { country: "DE", event: "German Factory Orders", impact: "high", time: "2026-10-03 06:00:00" },
          { country: "US", event: "Fed Speech", impact: "medium", time: "2026-10-04 15:00:00" }
        ]
      })
    });

    const res = await POST(makeRequest({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(2);
    expect(json.message).toMatch(/Synced 2/);
    expect(batchSet).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(1);

    const [, firstEvent] = batchSet.mock.calls[0];
    expect(firstEvent).toMatchObject({ id: "auto-2026-10-01-cpi", date: "2026-10-01", title: "CPI", impact: "High" });
  });

  it("returns 0 synced without committing when nothing matches the filter", async () => {
    withAdminEnv();
    process.env.FINNHUB_API_KEY = "token";
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ economicCalendar: [{ country: "DE", event: "Something", impact: "high", time: "2026-10-01 00:00:00" }] })
    });

    const res = await POST(makeRequest({ authorization: "Bearer ok" }));

    const json = await res.json();
    expect(json.count).toBe(0);
    expect(batchCommit).not.toHaveBeenCalled();
  });
});
