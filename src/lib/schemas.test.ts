import { describe, expect, it } from "vitest";
import { AiReviewRequestSchema, DailyChecklistSchema, RiskSettingsSchema, TradeSchema } from "./schemas";

function validTrade() {
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
    createdAt: Date.now()
  };
}

describe("TradeSchema", () => {
  it("accepts a well-formed trade", () => {
    expect(TradeSchema.safeParse(validTrade()).success).toBe(true);
  });

  it("accepts a trade without the optional takeProfit/screenshotUrl fields", () => {
    const trade = validTrade();
    expect(TradeSchema.safeParse(trade).success).toBe(true);
  });

  it("rejects a trade with an invalid direction enum value", () => {
    const trade = { ...validTrade(), direction: "Sideways" };
    expect(TradeSchema.safeParse(trade).success).toBe(false);
  });

  it("rejects a trade missing required fields", () => {
    const { notes: _notes, ...incomplete } = validTrade();
    expect(TradeSchema.safeParse(incomplete).success).toBe(false);
  });

  it("rejects a trade where a numeric field is sent as a string", () => {
    const trade = { ...validTrade(), pnl: "100" };
    expect(TradeSchema.safeParse(trade).success).toBe(false);
  });
});

describe("AiReviewRequestSchema", () => {
  it("rejects an empty trades array", () => {
    expect(AiReviewRequestSchema.safeParse({ trades: [] }).success).toBe(false);
  });

  it("accepts up to 500 trades", () => {
    const trades = Array.from({ length: 500 }, (_, i) => ({ ...validTrade(), id: `t${i}` }));
    expect(AiReviewRequestSchema.safeParse({ trades }).success).toBe(true);
  });

  it("rejects more than 500 trades", () => {
    const trades = Array.from({ length: 501 }, (_, i) => ({ ...validTrade(), id: `t${i}` }));
    expect(AiReviewRequestSchema.safeParse({ trades }).success).toBe(false);
  });
});

describe("RiskSettingsSchema", () => {
  it("accepts well-formed risk settings", () => {
    const settings = { accountBalance: 10000, riskPerTradePct: 1, maxDailyLossPct: 3, maxWeeklyLossPct: 6 };
    expect(RiskSettingsSchema.safeParse(settings).success).toBe(true);
  });

  it("rejects risk settings with a non-numeric field", () => {
    const settings = { accountBalance: "10000", riskPerTradePct: 1, maxDailyLossPct: 3, maxWeeklyLossPct: 6 };
    expect(RiskSettingsSchema.safeParse(settings).success).toBe(false);
  });
});

describe("DailyChecklistSchema", () => {
  it("accepts a checklist with a nullable completedAt", () => {
    const checklist = {
      id: "2026-08-20",
      items: [{ id: "i1", label: "Check bias", checked: true }],
      biasNotes: "",
      keyLevels: "",
      completedAt: null
    };
    expect(DailyChecklistSchema.safeParse(checklist).success).toBe(true);
  });

  it("rejects a checklist item missing the checked flag", () => {
    const checklist = {
      id: "2026-08-20",
      items: [{ id: "i1", label: "Check bias" }],
      biasNotes: "",
      keyLevels: "",
      completedAt: null
    };
    expect(DailyChecklistSchema.safeParse(checklist).success).toBe(false);
  });
});
