"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Badge, Button, Card, Select } from "@/components/ui/primitives";
import { TradeFormModal } from "@/components/TradeFormModal";
import { useAuth } from "@/lib/auth-context";
import { listTrades, saveTrade, deleteTrade } from "@/lib/data";
import { formatCurrency, formatR } from "@/lib/utils";
import type { Trade } from "@/lib/types";

export default function JournalPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Trade | undefined>(undefined);
  const [setupFilter, setSetupFilter] = useState("All");
  const [sessionFilter, setSessionFilter] = useState("All");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [sortKey, setSortKey] = useState<"date" | "rMultiple" | "pnl" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: "date" | "rMultiple" | "pnl") {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function refresh() {
    if (!user) return;
    const t = await listTrades(user.uid);
    setTrades(t);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    const result = trades.filter((t) => (setupFilter === "All" || t.setupType === setupFilter) && (sessionFilter === "All" || t.session === sessionFilter));
    if (!sortKey) return result;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      if (sortKey === "date") return a.date.localeCompare(b.date) * dir;
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [trades, setupFilter, sessionFilter, sortKey, sortDir]);

  async function handleSave(trade: Trade) {
    if (!user) return;
    await saveTrade(user.uid, trade);
    setShowForm(false);
    setEditing(undefined);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("Delete this trade? This cannot be undone.")) return;
    await deleteTrade(user.uid, id);
    refresh();
  }

  async function runAiReview() {
    if (!user || trades.length === 0) return;
    setAiLoading(true);
    setAiSummary(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trades })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAiSummary(data?.summary ?? "The AI review service returned an error. Please try again.");
        return;
      }
      setAiSummary(data?.summary ?? "No insights returned.");
    } catch {
      setAiSummary("Could not reach the AI review service. Check your ANTHROPIC_API_KEY setup.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <AppShell eyebrow="Records" title="Trade Journal">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Select value={setupFilter} onChange={(e) => setSetupFilter(e.target.value)} className="w-48">
            <option>All</option>
            {["Trend Continuation", "Reversal", "Range Breakout", "Liquidity Sweep", "News Fade", "Support/Resistance", "Other"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} className="w-40">
            <option>All</option>
            {["Asian", "London", "New York", "Overlap"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={runAiReview} disabled={aiLoading || trades.length === 0}>
            {aiLoading ? "Analyzing…" : "AI Pattern Review"}
          </Button>
          <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>+ Log Trade</Button>
        </div>
      </div>

      {aiSummary && (
        <Card className="mb-5 border-gold-dim/40 px-5 py-4">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-gold-bright">AI Pattern Review — based on your logged trades only</div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{aiSummary}</p>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wide text-faint">
                <th className="px-4 py-3"><SortHeader label="Date" active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} /></th>
                <th className="px-4 py-3">Dir</th>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Exit</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Setup</th>
                <th className="px-4 py-3">Mistake</th>
                <th className="px-4 py-3 text-right"><SortHeader label="R" active={sortKey === "rMultiple"} dir={sortDir} onClick={() => toggleSort("rMultiple")} align="right" /></th>
                <th className="px-4 py-3 text-right"><SortHeader label="P&L" active={sortKey === "pnl"} dir={sortDir} onClick={() => toggleSort("pnl")} align="right" /></th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-line/60 hover:bg-raised/50">
                  <td className="px-4 py-3">
                    <Link href={`/journal/${t.id}`} className="hover:text-gold-bright">{t.date}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={t.direction === "Long" ? "profit" : "loss"}>{t.direction}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{t.entryPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{t.exitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted">{t.session}</td>
                  <td className="px-4 py-3 text-muted">{t.setupType}</td>
                  <td className="px-4 py-3">
                    {t.mistakeTag !== "None" ? <Badge tone="loss">{t.mistakeTag}</Badge> : <span className="text-faint">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono tabular-nums ${t.rMultiple >= 0 ? "text-profit" : "text-loss"}`}>{formatR(t.rMultiple)}</td>
                  <td className={`px-4 py-3 text-right font-mono tabular-nums ${t.pnl >= 0 ? "text-profit" : "text-loss"}`}>{formatCurrency(t.pnl)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button className="text-xs text-muted hover:text-gold-bright" onClick={() => { setEditing(t); setShowForm(true); }}>Edit</button>
                      <button className="text-xs text-muted hover:text-loss" onClick={() => handleDelete(t.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-faint">
                    No trades yet. Log your first XAUUSD trade to start building your track record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <TradeFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
          onSave={handleSave}
        />
      )}
    </AppShell>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left"
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-gold-bright ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      <span>{label}</span>
      {active && <span>{dir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );
}
