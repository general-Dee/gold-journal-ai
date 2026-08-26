import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Trade } from "./types";

vi.mock("./firebase", () => ({
  db: "db-instance",
  storage: "storage-instance"
}));

const collection = vi.fn((...args: unknown[]) => ({ kind: "collection", args }));
const doc = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const getDocs = vi.fn();
const setDoc = vi.fn();
const deleteDoc = vi.fn();
const getDoc = vi.fn();
const query = vi.fn((...args: unknown[]) => ({ kind: "query", args }));
const orderBy = vi.fn((field: string, direction: string) => ({ field, direction }));
const serverTimestamp = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => collection(...args),
  doc: (...args: unknown[]) => doc(...args),
  getDocs: (...args: unknown[]) => getDocs(...args),
  setDoc: (...args: unknown[]) => setDoc(...args),
  deleteDoc: (...args: unknown[]) => deleteDoc(...args),
  getDoc: (...args: unknown[]) => getDoc(...args),
  query: (...args: unknown[]) => query(...args),
  orderBy: (...args: unknown[]) => orderBy(...(args as [string, string])),
  serverTimestamp: (...args: unknown[]) => serverTimestamp(...args)
}));

const storageRef = vi.fn((...args: unknown[]) => ({ kind: "storageRef", args }));
const uploadString = vi.fn();
const getDownloadURL = vi.fn();

vi.mock("firebase/storage", () => ({
  ref: (...args: unknown[]) => storageRef(...args),
  uploadString: (...args: unknown[]) => uploadString(...args),
  getDownloadURL: (...args: unknown[]) => getDownloadURL(...args)
}));

const {
  listTrades,
  saveTrade,
  deleteTrade,
  getTrade,
  uploadTradeScreenshot,
  getChecklist,
  saveChecklist,
  listPsychology,
  savePsychology,
  listPlaybookPages,
  savePlaybookPage,
  deletePlaybookPage,
  getRiskSettings,
  saveRiskSettings,
  listEconomicEvents,
  saveEconomicEvent,
  deleteEconomicEvent
} = await import("./data");

const UID = "user-1";

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
    notes: "",
    createdAt: Date.now(),
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("trades", () => {
  it("listTrades reads from users/{uid}/trades ordered by createdAt desc and parses each doc", async () => {
    const trade = validTrade();
    getDocs.mockResolvedValue({ docs: [{ data: () => trade }] });

    const result = await listTrades(UID);

    expect(collection).toHaveBeenCalledWith("db-instance", "users", UID, "trades");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(result).toEqual([trade]);
  });

  it("saveTrade validates the trade and writes it to users/{uid}/trades/{id}", async () => {
    const trade = validTrade();

    await saveTrade(UID, trade);

    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "trades", trade.id);
    expect(setDoc).toHaveBeenCalledWith(expect.objectContaining({ kind: "doc" }), trade);
  });

  it("saveTrade strips explicit undefined optional fields, since Firestore rejects them", async () => {
    const trade = { ...validTrade(), takeProfit: undefined, screenshotUrl: undefined };

    await saveTrade(UID, trade);

    const written = setDoc.mock.calls[0][1];
    expect(written).not.toHaveProperty("takeProfit");
    expect(written).not.toHaveProperty("screenshotUrl");
  });

  it("saveTrade rejects a trade that fails schema validation before writing", async () => {
    const invalid = { ...validTrade(), direction: "Sideways" } as unknown as Trade;

    await expect(saveTrade(UID, invalid)).rejects.toThrow();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("deleteTrade deletes users/{uid}/trades/{id}", async () => {
    await deleteTrade(UID, "t1");

    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "trades", "t1");
    expect(deleteDoc).toHaveBeenCalled();
  });

  it("getTrade returns the parsed trade when it exists", async () => {
    const trade = validTrade();
    getDoc.mockResolvedValue({ exists: () => true, data: () => trade });

    const result = await getTrade(UID, "t1");

    expect(result).toEqual(trade);
  });

  it("getTrade returns null when the document does not exist", async () => {
    getDoc.mockResolvedValue({ exists: () => false, data: () => undefined });

    const result = await getTrade(UID, "missing");

    expect(result).toBeNull();
  });

  it("uploadTradeScreenshot uploads to users/{uid}/trades/{tradeId}.jpg and returns the download URL", async () => {
    uploadString.mockResolvedValue(undefined);
    getDownloadURL.mockResolvedValue("https://example.com/photo.jpg");

    const url = await uploadTradeScreenshot(UID, "t1", "data:image/jpeg;base64,abc");

    expect(storageRef).toHaveBeenCalledWith("storage-instance", `users/${UID}/trades/t1.jpg`);
    expect(url).toBe("https://example.com/photo.jpg");
  });
});

describe("checklist", () => {
  it("getChecklist reads users/{uid}/checklists/{dateId}", async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    await getChecklist(UID, "2026-08-20");
    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "checklists", "2026-08-20");
  });

  it("saveChecklist writes to users/{uid}/checklists/{id}", async () => {
    const checklist = { id: "2026-08-20", items: [], biasNotes: "", keyLevels: "", completedAt: null };
    await saveChecklist(UID, checklist);
    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "checklists", checklist.id);
    expect(setDoc).toHaveBeenCalled();
  });
});

describe("psychology", () => {
  it("listPsychology reads users/{uid}/psychology ordered by createdAt desc", async () => {
    getDocs.mockResolvedValue({ docs: [] });
    await listPsychology(UID);
    expect(collection).toHaveBeenCalledWith("db-instance", "users", UID, "psychology");
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("savePsychology writes to users/{uid}/psychology/{id}", async () => {
    const entry = {
      id: "2026-08-20",
      disciplineScore: 7,
      moodScore: 7,
      rulesFollowed: true,
      revengeTradeFlag: false,
      reflection: "",
      createdAt: Date.now()
    };
    await savePsychology(UID, entry);
    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "psychology", entry.id);
  });
});

describe("playbook", () => {
  it("listPlaybookPages reads users/{uid}/playbook ordered by updatedAt desc", async () => {
    getDocs.mockResolvedValue({ docs: [] });
    await listPlaybookPages(UID);
    expect(collection).toHaveBeenCalledWith("db-instance", "users", UID, "playbook");
    expect(orderBy).toHaveBeenCalledWith("updatedAt", "desc");
  });

  it("savePlaybookPage writes to users/{uid}/playbook/{id}", async () => {
    const page = { id: "p1", title: "Setup", content: "", updatedAt: Date.now(), createdAt: Date.now() };
    await savePlaybookPage(UID, page);
    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "playbook", page.id);
  });

  it("deletePlaybookPage deletes users/{uid}/playbook/{id}", async () => {
    await deletePlaybookPage(UID, "p1");
    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "playbook", "p1");
    expect(deleteDoc).toHaveBeenCalled();
  });
});

describe("risk settings", () => {
  it("getRiskSettings reads users/{uid}/riskSettings/config", async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    await getRiskSettings(UID);
    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "riskSettings", "config");
  });

  it("saveRiskSettings writes to users/{uid}/riskSettings/config", async () => {
    const settings = { accountBalance: 10000, riskPerTradePct: 1, maxDailyLossPct: 3, maxWeeklyLossPct: 6 };
    await saveRiskSettings(UID, settings);
    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "riskSettings", "config");
    expect(setDoc).toHaveBeenCalled();
  });
});

describe("economic events", () => {
  it("listEconomicEvents reads users/{uid}/economicEvents ordered by date asc", async () => {
    getDocs.mockResolvedValue({ docs: [] });
    await listEconomicEvents(UID);
    expect(collection).toHaveBeenCalledWith("db-instance", "users", UID, "economicEvents");
    expect(orderBy).toHaveBeenCalledWith("date", "asc");
  });

  it("saveEconomicEvent writes to users/{uid}/economicEvents/{id}", async () => {
    const event = { id: "e1", date: "2026-08-20", time: "08:30", title: "NFP", impact: "High" as const };
    await saveEconomicEvent(UID, event);
    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "economicEvents", event.id);
  });

  it("deleteEconomicEvent deletes users/{uid}/economicEvents/{id}", async () => {
    await deleteEconomicEvent(UID, "e1");
    expect(doc).toHaveBeenCalledWith("db-instance", "users", UID, "economicEvents", "e1");
    expect(deleteDoc).toHaveBeenCalled();
  });
});
