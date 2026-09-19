import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { EconomicEventSchema } from "@/lib/schemas";
import type { EconomicEvent } from "@/lib/types";

export const runtime = "nodejs";

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// Free, keyless weekly feed (Forex Factory data). Unofficial, so every
// failure is surfaced as a friendly message rather than thrown.
const FEED_BASE_URL = "https://nfs.faireconomy.media";
const RELEVANT_CURRENCY = "USD";

interface FeedEvent {
  country?: string;
  date?: string;
  forecast?: string;
  impact?: string;
  previous?: string;
  title?: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeImpact(raw: string | undefined): EconomicEvent["impact"] | null {
  const v = (raw ?? "").toLowerCase();
  if (v === "high") return "High";
  if (v === "medium") return "Medium";
  if (v === "low") return "Low";
  return null;
}

async function withinRateLimit(uid: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection("calendarSyncRateLimits").doc(uid);
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
        { message: "Server auth is not configured. Set the FIREBASE_ADMIN_* environment variables." },
        { status: 200 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ message: "Sign in to sync the calendar." }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
    }

    const allowed = await withinRateLimit(uid);
    if (!allowed) {
      return NextResponse.json({ message: "You've hit the calendar sync rate limit. Try again in a bit." }, { status: 429 });
    }

    const thisWeekRes = await fetch(`${FEED_BASE_URL}/ff_calendar_thisweek.json`);

    if (!thisWeekRes.ok) {
      return NextResponse.json(
        { message: `Could not fetch the economic calendar (feed returned ${thisWeekRes.status}). Try again shortly.` },
        { status: 200 }
      );
    }

    const raw: FeedEvent[] = (await thisWeekRes.json()) as FeedEvent[];

    // Next week's file isn't always published yet; treat any failure as "no data".
    try {
      const nextWeekRes = await fetch(`${FEED_BASE_URL}/ff_calendar_nextweek.json`);
      if (nextWeekRes.ok) raw.push(...((await nextWeekRes.json()) as FeedEvent[]));
    } catch {
      // ignore
    }

    const db = getAdminDb();
    const batch = db.batch();
    const synced: EconomicEvent[] = [];

    for (const item of raw) {
      if ((item.country ?? "").toUpperCase() !== RELEVANT_CURRENCY) continue;
      const impact = normalizeImpact(item.impact);
      if (impact !== "High" && impact !== "Medium") continue;
      if (!item.title || !item.date) continue;

      const when = new Date(item.date);
      if (Number.isNaN(when.getTime())) continue;
      const [date, timeWithMs] = when.toISOString().split("T");
      const time = timeWithMs.slice(0, 8);

      const notes = [
        item.forecast ? `Fcst: ${item.forecast}` : null,
        item.previous ? `Prev: ${item.previous}` : null
      ]
        .filter(Boolean)
        .join(" · ");

      // Omit `notes` entirely when empty: Firestore rejects undefined field values.
      const event = EconomicEventSchema.parse({
        id: `auto-${date}-${slugify(item.title)}`,
        date,
        time,
        title: item.title,
        impact,
        ...(notes ? { notes } : {})
      });

      const ref = db.collection("users").doc(uid).collection("economicEvents").doc(event.id);
      batch.set(ref, event);
      synced.push(event);
    }

    if (synced.length > 0) {
      await batch.commit();
    }

    return NextResponse.json({ message: `Synced ${synced.length} gold-relevant event${synced.length === 1 ? "" : "s"}.`, count: synced.length });
  } catch (err) {
    console.error("Economic calendar sync error:", err);
    return NextResponse.json({ message: "The calendar sync service hit an error. Please try again shortly." }, { status: 200 });
  }
}
