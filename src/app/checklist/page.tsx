"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Label, Textarea } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth-context";
import { getChecklist, saveChecklist } from "@/lib/data";
import { todayId, cx } from "@/lib/utils";
import type { ChecklistItemState, DailyChecklist } from "@/lib/types";

const DEFAULT_ITEMS: ChecklistItemState[] = [
  { id: "1", label: "Checked high-impact news calendar for today", checked: false },
  { id: "2", label: "Identified current session and typical volatility window", checked: false },
  { id: "3", label: "Marked key daily/4H support & resistance levels", checked: false },
  { id: "4", label: "Confirmed daily bias (bullish / bearish / range)", checked: false },
  { id: "5", label: "Reviewed yesterday's trades and lessons", checked: false },
  { id: "6", label: "Set max daily loss limit and position size for today", checked: false },
  { id: "7", label: "Mentally confirmed: no revenge trading, no oversizing", checked: false }
];

export default function ChecklistPage() {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<DailyChecklist>({
    id: todayId(),
    items: DEFAULT_ITEMS,
    biasNotes: "",
    keyLevels: "",
    completedAt: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const existing = await getChecklist(user.uid, todayId());
      if (existing) setChecklist(existing);
      setLoading(false);
    })();
  }, [user]);

  const allChecked = checklist.items.every((i) => i.checked);

  function toggleItem(id: string) {
    setChecklist((c) => ({
      ...c,
      items: c.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    }));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const updated: DailyChecklist = {
      ...checklist,
      completedAt: allChecked ? Date.now() : null
    };
    await saveChecklist(user.uid, updated);
    setChecklist(updated);
    setSaving(false);
  }

  return (
    <AppShell eyebrow={todayId()} title="Pre-Market Checklist">
      {!loading && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                {checklist.items.filter((i) => i.checked).length} / {checklist.items.length} complete
              </div>
              {checklist.completedAt ? (
                <span className="rounded border border-profit/30 bg-profit/10 px-2 py-0.5 font-mono text-[11px] uppercase text-profit">
                  Desk unlocked
                </span>
              ) : (
                <span className="rounded border border-loss/30 bg-loss/10 px-2 py-0.5 font-mono text-[11px] uppercase text-loss">
                  Trading locked
                </span>
              )}
            </div>

            <div className="space-y-2">
              {checklist.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors",
                    item.checked ? "border-gold-dim/50 bg-gold/5 text-ink" : "border-line bg-raised text-muted hover:border-line"
                  )}
                >
                  <span
                    className={cx(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                      item.checked ? "border-gold bg-gold" : "border-faint"
                    )}
                  >
                    {item.checked && <span className="h-2 w-2 rounded-[1px] bg-bg" />}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>

            <Button onClick={handleSave} disabled={saving} className="mt-5">
              {saving ? "Saving…" : "Save Checklist"}
            </Button>
          </Card>

          <div className="space-y-5">
            <Card className="p-5">
              <Label>Daily Bias Notes</Label>
              <Textarea
                rows={4}
                value={checklist.biasNotes}
                onChange={(e) => setChecklist((c) => ({ ...c, biasNotes: e.target.value }))}
                placeholder="Bullish above 2380, bearish below 2365…"
              />
            </Card>
            <Card className="p-5">
              <Label>Key Levels</Label>
              <Textarea
                rows={4}
                value={checklist.keyLevels}
                onChange={(e) => setChecklist((c) => ({ ...c, keyLevels: e.target.value }))}
                placeholder="R: 2398 / 2405 — S: 2371 / 2360"
              />
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
