export type Session = "Asian" | "London" | "New York" | "Overlap";

export type Direction = "Long" | "Short";

export type SetupType =
  | "Trend Continuation"
  | "Reversal"
  | "Range Breakout"
  | "Liquidity Sweep"
  | "News Fade"
  | "Support/Resistance"
  | "Other";

export type MistakeTag =
  | "None"
  | "Revenge Trade"
  | "Early Entry"
  | "Late Entry"
  | "Moved Stop"
  | "Oversized"
  | "No Setup"
  | "FOMO"
  | "Ignored Checklist";

export interface Trade {
  id: string;
  date: string; // ISO date, e.g. 2026-08-20
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit?: number;
  lotSize: number;
  session: Session;
  setupType: SetupType;
  mistakeTag: MistakeTag;
  riskAmount: number; // account currency risked
  pnl: number; // realized P&L in account currency
  rMultiple: number; // pnl / riskAmount
  emotionBefore: number; // 1-5
  emotionDuring: number; // 1-5
  emotionAfter: number; // 1-5
  notes: string;
  screenshotUrl?: string;
  createdAt: number;
}

export interface ChecklistItemState {
  id: string;
  label: string;
  checked: boolean;
}

export interface DailyChecklist {
  id: string; // date, e.g. 2026-08-20
  items: ChecklistItemState[];
  biasNotes: string;
  keyLevels: string;
  completedAt: number | null;
}

export interface PsychologyEntry {
  id: string; // date
  disciplineScore: number; // 1-10
  moodScore: number; // 1-10
  rulesFollowed: boolean;
  revengeTradeFlag: boolean;
  reflection: string;
  createdAt: number;
}

export interface PlaybookPage {
  id: string;
  title: string;
  content: string; // markdown-ish plain text, block-based in UI
  updatedAt: number;
  createdAt: number;
}

export interface RiskSettings {
  accountBalance: number;
  riskPerTradePct: number;
  maxDailyLossPct: number;
  maxWeeklyLossPct: number;
}

export interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  impact: "Low" | "Medium" | "High";
  notes?: string;
}
