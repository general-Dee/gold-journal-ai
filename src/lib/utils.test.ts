import { describe, expect, it } from "vitest";
import {
  buildEquityCurve,
  calculatePositionSize,
  calculateStats,
  calculateTradePnl,
  cx,
  formatCurrency,
  formatR
} from "./utils";
import type { Trade } from "./types";

function makeTrade(overrides: Partial<Trade>): Trade {
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

describe("cx", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cx("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns an empty string when nothing is truthy", () => {
    expect(cx(false, null, undefined)).toBe("");
  });
});

describe("formatCurrency", () => {
  it("formats a positive number as USD", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats a negative number", () => {
    expect(formatCurrency(-42)).toBe("-$42.00");
  });
});

describe("formatR", () => {
  it("prefixes positive values with a plus sign", () => {
    expect(formatR(1.5)).toBe("+1.50R");
  });

  it("does not add a sign for negative or zero values", () => {
    expect(formatR(-1.5)).toBe("-1.50R");
    expect(formatR(0)).toBe("0.00R");
  });
});

describe("calculatePositionSize", () => {
  it("computes lot size from account balance, risk %, and stop distance", () => {
    const result = calculatePositionSize({
      accountBalance: 10000,
      riskPct: 1,
      entryPrice: 2400,
      stopLoss: 2390
    });
    // riskAmount = 100, stopDistance = 10, dollarRiskPerLot = 1000, lotSize = 0.1
    expect(result.riskAmount).toBe(100);
    expect(result.stopDistancePoints).toBe(10);
    expect(result.lotSize).toBe(0.1);
  });

  it("returns zero lot size when entry equals stop loss (no division by zero)", () => {
    const result = calculatePositionSize({
      accountBalance: 10000,
      riskPct: 1,
      entryPrice: 2400,
      stopLoss: 2400
    });
    expect(result.stopDistancePoints).toBe(0);
    expect(result.lotSize).toBe(0);
  });

  it("respects a custom pointValuePerLot override", () => {
    const result = calculatePositionSize({
      accountBalance: 10000,
      riskPct: 1,
      entryPrice: 2400,
      stopLoss: 2390,
      pointValuePerLot: 50
    });
    // dollarRiskPerLot = 10 * 50 = 500, lotSize = 100 / 500 = 0.2
    expect(result.lotSize).toBe(0.2);
  });
});

describe("calculateTradePnl", () => {
  it("computes positive pnl and rMultiple for a winning long trade", () => {
    const result = calculateTradePnl({
      direction: "Long",
      entryPrice: 2400,
      exitPrice: 2410,
      stopLoss: 2395,
      lotSize: 0.1
    });
    // priceDelta = 10, pnl = 10 * 100 * 0.1 = 100
    // riskAmount = 5 * 100 * 0.1 = 50, rMultiple = 100/50 = 2
    expect(result.pnl).toBe(100);
    expect(result.riskAmount).toBe(50);
    expect(result.rMultiple).toBe(2);
  });

  it("computes negative pnl for a losing short trade", () => {
    const result = calculateTradePnl({
      direction: "Short",
      entryPrice: 2400,
      exitPrice: 2410,
      stopLoss: 2405,
      lotSize: 0.1
    });
    // priceDelta = 2400 - 2410 = -10, pnl = -100
    expect(result.pnl).toBe(-100);
    expect(result.rMultiple).toBe(-2);
  });

  it("returns rMultiple 0 when riskAmount is 0", () => {
    const result = calculateTradePnl({
      direction: "Long",
      entryPrice: 2400,
      exitPrice: 2410,
      stopLoss: 2400,
      lotSize: 0.1
    });
    expect(result.riskAmount).toBe(0);
    expect(result.rMultiple).toBe(0);
  });
});

describe("calculateStats", () => {
  it("returns zeroed stats for an empty trade list", () => {
    const stats = calculateStats([]);
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.streakType).toBe("none");
    expect(stats.bestSetup).toBeNull();
    expect(stats.worstSetup).toBeNull();
  });

  it("computes win rate, pnl totals, and profit factor across mixed trades", () => {
    const trades = [
      makeTrade({ id: "1", createdAt: 1, pnl: 100, setupType: "Trend Continuation" }),
      makeTrade({ id: "2", createdAt: 2, pnl: -50, setupType: "Reversal" }),
      makeTrade({ id: "3", createdAt: 3, pnl: 200, setupType: "Trend Continuation" })
    ];
    const stats = calculateStats(trades);
    expect(stats.totalTrades).toBe(3);
    expect(stats.winRate).toBeCloseTo((2 / 3) * 100);
    expect(stats.totalPnl).toBe(250);
    expect(stats.avgWin).toBe(150);
    expect(stats.avgLoss).toBe(-50);
    expect(stats.profitFactor).toBeCloseTo(300 / 50);
    expect(stats.bestSetup).toBe("Trend Continuation");
    expect(stats.worstSetup).toBe("Reversal");
  });

  it("tracks the current win/loss streak from the most recent trade backwards", () => {
    const trades = [
      makeTrade({ id: "1", createdAt: 1, pnl: -10 }),
      makeTrade({ id: "2", createdAt: 2, pnl: 100 }),
      makeTrade({ id: "3", createdAt: 3, pnl: 100 })
    ];
    const stats = calculateStats(trades);
    expect(stats.streakType).toBe("win");
    expect(stats.currentStreak).toBe(2);
  });

  it("treats gross win as the profit factor when there are no losses", () => {
    const trades = [makeTrade({ id: "1", createdAt: 1, pnl: 100 })];
    const stats = calculateStats(trades);
    expect(stats.profitFactor).toBe(100);
  });
});

describe("buildEquityCurve", () => {
  it("accumulates pnl on top of the starting balance in chronological order", () => {
    const trades = [
      makeTrade({ id: "2", createdAt: 2, date: "2026-08-21", pnl: -50 }),
      makeTrade({ id: "1", createdAt: 1, date: "2026-08-20", pnl: 100 })
    ];
    const curve = buildEquityCurve(trades, 1000);
    expect(curve).toEqual([
      { date: "2026-08-20", balance: 1100 },
      { date: "2026-08-21", balance: 1050 }
    ]);
  });

  it("returns just the starting balance point set when there are no trades", () => {
    expect(buildEquityCurve([], 1000)).toEqual([]);
  });
});
