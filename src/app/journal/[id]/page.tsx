"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { TradeFormModal } from "@/components/TradeFormModal";
import { useAuth } from "@/lib/auth-context";
import { getTrade, saveTrade, deleteTrade } from "@/lib/data";
import { formatCurrency, formatR } from "@/lib/utils";
import type { Trade } from "@/lib/types";

export default function TradeDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const t = await getTrade(user.uid, params.id);
      setTrade(t);
      setLoading(false);
    })();
  }, [user, params.id]);

  async function handleSave(updated: Trade) {
    if (!user) return;
    await saveTrade(user.uid, updated);
    setTrade(updated);
    setShowForm(false);
  }

  async function handleDelete() {
    if (!user || !trade) return;
    if (!confirm("Delete this trade? This cannot be undone.")) return;
    await deleteTrade(user.uid, trade.id);
    router.push("/journal");
  }

  return (
    <AppShell eyebrow="Trade Detail" title={trade ? `${trade.date} · ${trade.direction} XAUUSD` : "Loading…"}>
      <div className="mb-5 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/journal")}>← Back to Journal</Button>
        {trade && (
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowForm(true)}>Edit</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        )}
      </div>

      {!loading && !trade && <div className="text-sm text-faint">Trade not found.</div>}

      {trade && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-6">
            <div className="mb-5 flex items-center gap-3">
              <Badge tone={trade.direction === "Long" ? "profit" : "loss"}>{trade.direction}</Badge>
              <Badge>{trade.session}</Badge>
              <Badge>{trade.setupType}</Badge>
              {trade.mistakeTag !== "None" && <Badge tone="loss">{trade.mistakeTag}</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Field label="Entry" value={trade.entryPrice.toFixed(2)} />
              <Field label="Exit" value={trade.exitPrice.toFixed(2)} />
              <Field label="Stop Loss" value={trade.stopLoss.toFixed(2)} />
              <Field label="Lot Size" value={trade.lotSize.toFixed(2)} />
              <Field label="Risk Amount" value={formatCurrency(trade.riskAmount)} />
              <Field label="P&L" value={formatCurrency(trade.pnl)} tone={trade.pnl >= 0 ? "profit" : "loss"} />
              <Field label="R Multiple" value={formatR(trade.rMultiple)} tone={trade.rMultiple >= 0 ? "profit" : "loss"} />
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Notes</div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{trade.notes || "No notes recorded."}</p>
            </div>

            {trade.screenshotUrl && (
              <div className="mt-6 border-t border-line pt-5">
                <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Screenshot</div>
                <div className="relative h-96 w-full">
                  <Image
                    src={trade.screenshotUrl}
                    alt="Trade screenshot"
                    fill
                    className="rounded-md border border-line object-contain"
                  />
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Psychology Snapshot</div>
            <EmotionRow label="Before" value={trade.emotionBefore} />
            <EmotionRow label="During" value={trade.emotionDuring} />
            <EmotionRow label="After" value={trade.emotionAfter} />
          </Card>
        </div>
      )}

      {showForm && trade && (
        <TradeFormModal initial={trade} onClose={() => setShowForm(false)} onSave={handleSave} />
      )}
    </AppShell>
  );
}

function Field({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "profit" | "loss" }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-ink";
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{label}</div>
      <div className={`mt-1 font-mono text-lg tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function EmotionRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-2 w-4 rounded-sm ${n <= value ? "bg-gold" : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}
