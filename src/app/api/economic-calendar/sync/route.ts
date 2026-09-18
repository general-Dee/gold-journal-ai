import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { EconomicEventSchema } from "@/lib/schemas";
import type { EconomicEvent } from "@/lib/types";

export const runtime = "nodejs";

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const RELEVANT_COUNTRY = "US";
const LOOKAHEAD_DAYS = 30;

interface FinnhubEconomicEvent {
  actual?: number | null;
  country?: string;
  estimate?: number | null;
  event?: string;
  impact?: string;
  prev?: number | null;
  time?: string;
  unit?: string;
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

    if (!process.env.FINNHUB_API_KEY) {
      return NextResponse.json(
        { message: "FINNHUB_API_KEY is not configured on the server. Add it in your Vercel project's environment variables." },
        { status: 200 }
      );
    }

    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const finnhubRes = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
    );

    if (!finnhubRes.ok) {
      const status = finnhubRes.status;
      const hint = status === 403 ? " (this endpoint may require a paid Finnhub plan)" : "";
      return NextResponse.json(
        { message: `Could not fetch the economic calendar (Finnhub returned ${status})${hint}.` },
        { status: 200 }
      );
    }

    const body = (await finnhubRes.json()) as { economicCalendar?: FinnhubEconomicEvent[] };
    const raw = body.economicCalendar ?? [];

    const db = getAdminDb();
    const batch = db.batch();
    const synced: EconomicEvent[] = [];

    for (const item of raw) {
      if ((item.country ?? "").toUpperCase() !== RELEVANT_COUNTRY) continue;
      const impact = normalizeImpact(item.impact);
      if (impact !== "High" && impact !== "Medium") continue;
      if (!item.event || !item.time) continue;

      const [date, time = ""] = item.time.split(" ");
      if (!date) continue;

      const event = EconomicEventSchema.parse({
        id: `auto-${date}-${slugify(item.event)}`,
        date,
        time,
        title: item.event,
        impact,
        notes: [
          item.estimate != null ? `Est: ${item.estimate}${item.unit ?? ""}` : null,
          item.prev != null ? `Prev: ${item.prev}${item.unit ?? ""}` : null
        ]
          .filter(Boolean)
          .join(" · ") || undefined
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
