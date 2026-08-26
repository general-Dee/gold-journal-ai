import { z } from "zod";

export const SessionSchema = z.enum(["Asian", "London", "New York", "Overlap"]);
export const DirectionSchema = z.enum(["Long", "Short"]);
export const SetupTypeSchema = z.enum([
  "Trend Continuation",
  "Reversal",
  "Range Breakout",
  "Liquidity Sweep",
  "News Fade",
  "Support/Resistance",
  "Other"
]);
export const MistakeTagSchema = z.enum([
  "None",
  "Revenge Trade",
  "Early Entry",
  "Late Entry",
  "Moved Stop",
  "Oversized",
  "No Setup",
  "FOMO",
  "Ignored Checklist"
]);

export const TradeSchema = z.object({
  id: z.string(),
  date: z.string(),
  direction: DirectionSchema,
  entryPrice: z.number(),
  exitPrice: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number().optional(),
  lotSize: z.number(),
  session: SessionSchema,
  setupType: SetupTypeSchema,
  mistakeTag: MistakeTagSchema,
  riskAmount: z.number(),
  pnl: z.number(),
  rMultiple: z.number(),
  emotionBefore: z.number(),
  emotionDuring: z.number(),
  emotionAfter: z.number(),
  notes: z.string(),
  screenshotUrl: z.string().optional(),
  createdAt: z.number()
});

export const ChecklistItemStateSchema = z.object({
  id: z.string(),
  label: z.string(),
  checked: z.boolean()
});

export const DailyChecklistSchema = z.object({
  id: z.string(),
  items: z.array(ChecklistItemStateSchema),
  biasNotes: z.string(),
  keyLevels: z.string(),
  completedAt: z.number().nullable()
});

export const PsychologyEntrySchema = z.object({
  id: z.string(),
  disciplineScore: z.number(),
  moodScore: z.number(),
  rulesFollowed: z.boolean(),
  revengeTradeFlag: z.boolean(),
  reflection: z.string(),
  createdAt: z.number()
});

export const PlaybookPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  updatedAt: z.number(),
  createdAt: z.number()
});

export const RiskSettingsSchema = z.object({
  accountBalance: z.number(),
  riskPerTradePct: z.number(),
  maxDailyLossPct: z.number(),
  maxWeeklyLossPct: z.number()
});

export const EconomicEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  title: z.string(),
  impact: z.enum(["Low", "Medium", "High"]),
  notes: z.string().optional()
});

// The route re-trims each trade to a smaller field set server-side before
// it ever reaches Anthropic (see route.ts) — this only validates the shape
// of what the client is allowed to submit.
export const AiReviewRequestSchema = z.object({
  trades: z.array(TradeSchema).min(1).max(500)
});
