# GoldJournal AI

A full-stack trading command center for XAUUSD (gold) traders — trade journal, pre-market checklist, risk calculator, discipline/psychology tracker, strategy playbook, manual economic calendar, and an AI pattern-review assistant that analyzes your own logged trades (no signals, no predictions, no live broker connection).

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Firebase (Auth + Firestore + Storage) · Anthropic API · Vercel · npm

---

## 1. Local setup

```bash
npm install
cp .env.local.example .env.local
# fill in .env.local (see sections below)
npm run dev
```

Open http://localhost:3000 — you'll land on `/login` since Firebase Auth guards every page.

---

## 2. Firebase setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Create a project**.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → Create database → start in production mode.
4. **Storage** → Get started (used for trade screenshots).
5. Project Settings → General → **Your apps** → Web app → copy the config values into `.env.local` (all `NEXT_PUBLIC_FIREBASE_*` keys).
6. Deploy the included security rules so users can only read/write their own data:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore storage   # point it at this repo; use firestore.rules and storage.rules
firebase deploy --only firestore:rules,storage:rules
```

The rules in `firestore.rules` scope every collection under `/users/{uid}/...` to the authenticated owner — no user can read another user's trades. `storage.rules` applies the same per-user scoping to trade screenshots under `users/{uid}/trades/`.

---

## 3. Anthropic API (AI Pattern Review)

1. Get an API key at [console.anthropic.com](https://console.anthropic.com).
2. Set `ANTHROPIC_API_KEY` in `.env.local` (server-side only — never prefix with `NEXT_PUBLIC_`).
3. Also set the `FIREBASE_ADMIN_*` variables (see `.env.local.example`) — the route verifies each caller's Firebase ID token server-side before running a review, and rejects unauthenticated requests.
4. The `/api/ai-review` route sends only anonymized trade stats (no account numbers, no personal identifiers) to Claude and returns pattern insights based strictly on your own historical, closed trades. It never generates trade ideas, entries, or predictions. Each signed-in user is limited to 20 reviews per hour.

---

## 4. Deploy to Vercel

```bash
npx vercel
```

Or via the Vercel dashboard:
1. Import this repo.
2. Framework preset: **Next.js** (auto-detected).
3. Add all environment variables from `.env.local` under Project Settings → Environment Variables (both Production and Preview).
4. Deploy.

---

## 5. Data model (Firestore)

All data lives under `/users/{uid}/...`:

| Collection | Purpose |
|---|---|
| `trades` | Full trade log — entry/exit, R multiple, P&L, setup, session, emotions, notes, screenshot |
| `checklists` | Daily pre-market checklist completion, keyed by date |
| `psychology` | Daily discipline/mood score, rule adherence, reflections |
| `playbook` | Notion-style freeform strategy/setup pages |
| `riskSettings` | Account balance, risk %, max daily/weekly loss limits |
| `economicEvents` | Manually logged high-impact news events |

Trade screenshots are stored in Firebase Storage at `users/{uid}/trades/{tradeId}.jpg`.

---

## 6. What this app deliberately does NOT do

- No live broker/MT4/MT5 connection.
- No buy/sell signal generation or price predictions.
- The AI assistant only ever analyzes your own already-closed, journaled trades to surface patterns — it does not tell you what to trade next.

This is intentional: the app is a discipline and record-keeping system, not an autotrading or signals tool.

---

## 7. Project structure

```
src/
  app/
    page.tsx              Dashboard
    login/                 Auth
    journal/                Trade log + [id] detail
    checklist/              Pre-market checklist
    risk/                    Position size calculator + loss limits
    playbook/               Notion-style strategy pages
    psychology/              Discipline/mood tracker
    calendar/                Manual economic calendar
    api/ai-review/            Anthropic-powered pattern analysis
  components/               Shared UI (Sidebar, AppShell, forms, primitives)
  lib/                      Firebase client, data access layer, types, calculations
firestore.rules             Per-user data isolation rules
```
