"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, Input, Label, Textarea } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth-context";
import { listPsychology, savePsychology } from "@/lib/data";
import { todayId, cx } from "@/lib/utils";
import type { PsychologyEntry } from "@/lib/types";

export default function PsychologyPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PsychologyEntry[]>([]);
  const [form, setForm] = useState<PsychologyEntry>({
    id: todayId(),
    disciplineScore: 7,
    moodScore: 7,
    rulesFollowed: true,
    revengeTradeFlag: false,
    reflection: "",
    createdAt: Date.now()
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const list = await listPsychology(user.uid);
      setEntries(list);
      const today = list.find((e) => e.id === todayId());
      if (today) setForm(today);
    })();
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const updated = { ...form, createdAt: form.createdAt || Date.now() };
    await savePsychology(user.uid, updated);
    setEntries((e) => [updated, ...e.filter((x) => x.id !== updated.id)]);
    setSaving(false);
  }

  const avgDiscipline = entries.length ? entries.reduce((s, e) => s + e.disciplineScore, 0) / entries.length : 0;
  const revengeTradeDays = entries.filter((e) => e.revengeTradeFlag).length;

  return (
    <AppShell eyebrow={todayId()} title="Psychology & Discipline">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Today&apos;s Check-In</div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label>Discipline Score (1-10)</Label>
              <Input type="number" min={1} max={10} value={form.disciplineScore} onChange={(e) => setForm((f) => ({ ...f, disciplineScore: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Mood Score (1-10)</Label>
              <Input type="number" min={1} max={10} value={form.moodScore} onChange={(e) => setForm((f) => ({ ...f, moodScore: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          <div className="mt-4 flex gap-6">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={form.rulesFollowed} onChange={(e) => setForm((f) => ({ ...f, rulesFollowed: e.target.checked }))} />
              Followed trading rules today
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={form.revengeTradeFlag} onChange={(e) => setForm((f) => ({ ...f, revengeTradeFlag: e.target.checked }))} />
              Caught myself revenge trading
            </label>
          </div>

          <div className="mt-4">
            <Label>Reflection</Label>
            <Textarea
              rows={6}
              value={form.reflection}
              onChange={(e) => setForm((f) => ({ ...f, reflection: e.target.value }))}
              placeholder="Operator brain or trader brain today? What triggered any deviation from plan?"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="mt-5">{saving ? "Saving…" : "Save Check-In"}</Button>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Avg Discipline Score</div>
            <div className="mt-2 font-display text-2xl text-gold-bright">{avgDiscipline.toFixed(1)} / 10</div>
          </Card>
          <Card className="p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Revenge Trade Days</div>
            <div className={cx("mt-2 font-display text-2xl", revengeTradeDays > 0 ? "text-loss" : "text-profit")}>{revengeTradeDays}</div>
          </Card>
          <Card className="p-5">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Recent Entries</div>
            <div className="space-y-2">
              {entries.slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted">{e.id}</span>
                  <span className={e.disciplineScore >= 7 ? "text-profit" : "text-loss"}>{e.disciplineScore}/10</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
