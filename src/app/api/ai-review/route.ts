import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { AiReviewRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

async function withinRateLimit(uid: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection("aiReviewRateLimits").doc(uid);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { windowStart: number; count: number } | undefined;

    if (!data || now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      tx.set(ref, { windowStart: now, count: 1 });
      return true;
    }

    if (data.count >= RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    tx.update(ref, { count: data.count + 1 });
    return true;
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      return NextResponse.json(
        { summary: "Server auth is not configured. Set the FIREBASE_ADMIN_* environment variables." },
        { status: 200 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ summary: "Sign in to run the AI review." }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ summary: "Your session has expired. Sign in again." }, { status: 401 });
    }

    const allowed = await withinRateLimit(uid);
    if (!allowed) {
      return NextResponse.json(
        { summary: "You've hit the AI review rate limit. Try again in a bit." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawTrades = (body as { trades?: unknown[] } | null)?.trades;
    if (!Array.isArray(rawTrades) || rawTrades.length === 0) {
      return NextResponse.json({ summary: "Log a few trades first, then run this review." });
    }

    const parsed = AiReviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ summary: "That trade data isn't in the expected shape." }, { status: 400 });
    }
    const { trades } = parsed.data;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { summary: "ANTHROPIC_API_KEY is not configured on the server. Add it in your Vercel project's environment variables." },
        { status: 200 }
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Strip to the fields relevant to pattern analysis; never send account identifiers.
    const compact = trades.slice(0, 200).map((t) => ({
      date: t.date,
      direction: t.direction,
      session: t.session,
      setupType: t.setupType,
      mistakeTag: t.mistakeTag,
      rMultiple: t.rMultiple,
      pnl: t.pnl,
      emotionBefore: t.emotionBefore,
      emotionDuring: t.emotionDuring,
      emotionAfter: t.emotionAfter
    }));

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system:
        "You are a disciplined trading-performance analyst reviewing ONLY the trader's own historical, already-closed XAUUSD journal entries provided in the user message. " +
        "Never suggest future trade ideas, price predictions, entries, or signals. " +
        "Find concrete statistical patterns in this specific data: which sessions, setups, or emotional states correlate with better or worse R-multiples; recurring mistake tags; " +
        "streak or overtrading patterns; and one or two concrete, specific process changes the trader could test next week. " +
        "Be direct and concise, structured as short paragraphs or a tight bulleted list. No generic trading platitudes — every point must trace back to a pattern in the data given.",
      messages: [
        {
          role: "user",
          content: `Here is my closed-trade journal data as JSON. Analyze it and give me my performance patterns:\n\n${JSON.stringify(compact)}`
        }
      ]
    });

    const textBlock = message.content.find((b: Anthropic.ContentBlock) => b.type === "text");
    const summary = textBlock && "text" in textBlock ? textBlock.text : "No insights returned.";

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("AI review error:", err);
    return NextResponse.json({ summary: "The AI review service hit an error. Please try again shortly." }, { status: 200 });
  }
}
