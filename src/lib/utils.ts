import type { Direction, Trade } from "./types";

/**
 * XAUUSD: 1.00-price-point move on a 1.00 lot = $100 (see calculatePositionSize).
 * Shared by the risk calculator and the trade form so P&L/R math can't drift apart.
 */
export const DEFAULT_POINT_VALUE_PER_LOT = 100;

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatR(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

/**
 * XAUUSD position sizing.
 * Gold is quoted in USD per troy ounce; standard lot = 100 oz.
 * 1 pip (0.01 move) on a standard lot (1.00 lot) = $1 per 0.01, i.e.
 * dollar value per point (1.00 price move) on 1.00 lot = $100.
 * pointValuePerLot lets the trader override this if their broker quotes differently.
 */
export function calculatePositionSize(params: {
  accountBalance: number;
  riskPct: number;
  entryPrice: number;
  stopLoss: number;
  pointValuePerLot?: number;
}) {
  const { accountBalance, riskPct, entryPrice, stopLoss, pointValuePerLot = DEFAULT_POINT_VALUE_PER_LOT } = params;
  const riskAmount = accountBalance * (riskPct / 100);
  const stopDistancePoints = Math.abs(entryPrice - stopLoss);
  if (stopDistancePoints === 0) {
    return { riskAmount, stopDistancePoints: 0, lotSize: 0 };
  }
  const dollarRiskPerLot = stopDistancePoints * pointValuePerLot;
  const lotSize = riskAmount / dollarRiskPerLot;
  return {
    riskAmount,
    stopDistancePoints,
    lotSize: Math.round(lotSize * 100) / 100
  };
}

export function calculateTradePnl(params: {
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  lotSize: number;
  pointValuePerLot?: number;
}) {
  const { direction, entryPrice, exitPrice, stopLoss, lotSize, pointValuePerLot = DEFAULT_POINT_VALUE_PER_LOT } = params;
  const priceDelta = direction === "Long" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const pnl = Math.round(priceDelta * pointValuePerLot * lotSize * 100) / 100;
  const riskAmount = Math.round(Math.abs(entryPrice - stopLoss) * pointValuePerLot * lotSize * 100) / 100;
  const rMultiple = riskAmount > 0 ? Math.round((pnl / riskAmount) * 100) / 100 : 0;
  return { pnl, riskAmount, rMultiple };
}

export interface TradeStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  currentStreak: number;
  streakType: "win" | "loss" | "none";
  bestSetup: string | null;
  worstSetup: string | null;
}

export function calculateStats(trades: Trade[]): TradeStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      currentStreak: 0,
      streakType: "none",
      bestSetup: null,
      worstSetup: null
    };
  }

  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  const wins = sorted.filter((t) => t.pnl > 0);
  const losses = sorted.filter((t) => t.pnl < 0);
  const totalPnl = sorted.reduce((sum, t) => sum + t.pnl, 0);
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const winRate = (wins.length / sorted.length) * 100;
  const profitFactor = grossLoss === 0 ? grossWin : grossWin / grossLoss;
  const expectancy = (winRate / 100) * avgWin + (1 - winRate / 100) * avgLoss;

  let currentStreak = 0;
  let streakType: "win" | "loss" | "none" = "none";
  for (let i = sorted.length - 1; i >= 0; i--) {
    const isWin = sorted[i].pnl > 0;
    if (i === sorted.length - 1) {
      streakType = isWin ? "win" : "loss";
      currentStreak = 1;
    } else if ((isWin && streakType === "win") || (!isWin && streakType === "loss")) {
      currentStreak++;
    } else {
      break;
    }
  }

  const setupPnl = new Map<string, number>();
  for (const t of sorted) {
    setupPnl.set(t.setupType, (setupPnl.get(t.setupType) ?? 0) + t.pnl);
  }
  let bestSetup: string | null = null;
  let worstSetup: string | null = null;
  let bestVal = -Infinity;
  let worstVal = Infinity;
  for (const [setup, pnl] of setupPnl.entries()) {
    if (pnl > bestVal) {
      bestVal = pnl;
      bestSetup = setup;
    }
    if (pnl < worstVal) {
      worstVal = pnl;
      worstSetup = setup;
    }
  }

  return {
    totalTrades: sorted.length,
    winRate,
    totalPnl,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    currentStreak,
    streakType,
    bestSetup,
    worstSetup
  };
}

export function buildEquityCurve(trades: Trade[], startingBalance: number) {
  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  let running = startingBalance;
  return sorted.map((t) => {
    running += t.pnl;
    return { date: t.date, balance: Math.round(running * 100) / 100 };
  });
}

export function buildDrawdownCurve(trades: Trade[], startingBalance: number) {
  const equity = buildEquityCurve(trades, startingBalance);
  let peak = startingBalance;
  return equity.map((point) => {
    if (point.balance > peak) peak = point.balance;
    const dd = peak - point.balance;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    return { date: point.date, drawdown: Math.round(dd * 100) / 100, drawdownPct: Math.round(ddPct * 10) / 10 };
  });
}

export interface BreakdownRow {
  label: string;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgR: number;
}

export function breakdownBySession(trades: Trade[]): BreakdownRow[] {
  return breakdownBy(trades, (t) => t.session);
}

export function breakdownBySetup(trades: Trade[]): BreakdownRow[] {
  return breakdownBy(trades, (t) => t.setupType);
}

function breakdownBy(trades: Trade[], keyFn: (t: Trade) => string): BreakdownRow[] {
  const groups = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = keyFn(t);
    const arr = groups.get(k) ?? [];
    arr.push(t);
    groups.set(k, arr);
  }
  const rows: BreakdownRow[] = [];
  for (const [label, group] of groups.entries()) {
    const wins = group.filter((t) => t.pnl > 0).length;
    const totalPnl = group.reduce((s, t) => s + t.pnl, 0);
    const avgR = group.reduce((s, t) => s + t.rMultiple, 0) / group.length;
    rows.push({
      label,
      trades: group.length,
      winRate: (wins / group.length) * 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      avgR: Math.round(avgR * 100) / 100
    });
  }
  return rows.sort((a, b) => b.totalPnl - a.totalPnl);
}

export function todayId() {
  return new Date().toISOString().slice(0, 10);
}

const CSV_COLUMNS: Array<keyof Trade> = [
  "date",
  "direction",
  "entryPrice",
  "exitPrice",
  "stopLoss",
  "takeProfit",
  "lotSize",
  "session",
  "setupType",
  "mistakeTag",
  "riskAmount",
  "pnl",
  "rMultiple",
  "emotionBefore",
  "emotionDuring",
  "emotionAfter",
  "notes"
];

function csvEscape(value: unknown): string {
  const s = value === undefined || value === null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function tradesToCsv(trades: Trade[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = trades.map((t) => CSV_COLUMNS.map((col) => csvEscape(t[col])).join(","));
  return [header, ...rows].join("\n");
}
