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
  date: string;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit?: number;
  lotSize: number;
  session: Session;
  setupType: SetupType;
  mistakeTag: MistakeTag;
  riskAmount: number;
  pnl: number;
  rMultiple: number;
  emotionBefore: number;
  emotionDuring: number;
  emotionAfter: number;
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
  id: string;
  items: ChecklistItemState[];
  biasNotes: string;
  keyLevels: string;
  completedAt: number | null;
}

export interface PsychologyEntry {
  id: string;
  disciplineScore: number;
  moodScore: number;
  rulesFollowed: boolean;
  revengeTradeFlag: boolean;
  reflection: string;
  createdAt: number;
}

export interface PlaybookPage {
  id: string;
  title: string;
  content: string;
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

export interface AiReview {
  id: string;
  summary: string;
  tradeCount: number;
  createdAt: number;
}
