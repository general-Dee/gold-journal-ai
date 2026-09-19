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

  function mockFeeds(thisWeek: unknown, nextWeekStatus = 404) {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("thisweek")) return { ok: true, status: 200, json: async () => thisWeek };
      return { ok: nextWeekStatus === 200, status: nextWeekStatus, json: async () => [] };
    });
  }

  it("returns a message with 200 when the feed returns a non-ok response", async () => {
    withAdminEnv();
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);
    fetchMock.mockResolvedValue({ ok: false, status: 429 });

    const res = await POST(makeRequest({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/429/);
  });

  it("filters to USD medium/high impact events, converts to UTC, and writes them via a batch", async () => {
    withAdminEnv();
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);
    batchCommit.mockResolvedValue(undefined);
    mockFeeds([
      { country: "USD", title: "CPI m/m", impact: "High", date: "2026-10-01T08:30:00-04:00", forecast: "0.3%", previous: "0.2%" },
      { country: "USD", title: "Low Impact Thing", impact: "Low", date: "2026-10-02T08:00:00-04:00" },
      { country: "EUR", title: "German Factory Orders", impact: "High", date: "2026-10-03T06:00:00-04:00" },
      { country: "USD", title: "Bank Holiday", impact: "Holiday", date: "2026-10-05T00:00:00-04:00" },
      { country: "USD", title: "Fed Speech", impact: "Medium", date: "2026-10-04T15:00:00-04:00" }
    ]);

    const res = await POST(makeRequest({ authorization: "Bearer ok" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(2);
    expect(json.message).toMatch(/Synced 2/);
    expect(batchSet).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(1);

    const [, firstEvent] = batchSet.mock.calls[0];
    expect(firstEvent).toMatchObject({
      id: "auto-2026-10-01-cpi-m-m",
      date: "2026-10-01",
      time: "12:30:00",
      title: "CPI m/m",
      impact: "High",
      notes: "Fcst: 0.3% · Prev: 0.2%"
    });
  });

  it("still syncs this week's events when next week's file is missing (404)", async () => {
    withAdminEnv();
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);
    batchCommit.mockResolvedValue(undefined);
    mockFeeds([{ country: "USD", title: "NFP", impact: "High", date: "2026-10-02T08:30:00-04:00" }], 404);

    const res = await POST(makeRequest({ authorization: "Bearer ok" }));

    const json = await res.json();
    expect(json.count).toBe(1);
  });

  it("returns 0 synced without committing when nothing matches the filter", async () => {
    withAdminEnv();
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    runTransaction.mockResolvedValue(true);
    mockFeeds([{ country: "EUR", title: "Something", impact: "High", date: "2026-10-01T00:00:00-04:00" }]);

    const res = await POST(makeRequest({ authorization: "Bearer ok" }));

    const json = await res.json();
    expect(json.count).toBe(0);
    expect(batchCommit).not.toHaveBeenCalled();
  });
});
