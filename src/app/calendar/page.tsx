"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge, Button, Card, Input, Select } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth-context";
import { listEconomicEvents, saveEconomicEvent, deleteEconomicEvent } from "@/lib/data";
import type { EconomicEvent } from "@/lib/types";

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [form, setForm] = useState<Partial<EconomicEvent>>({ impact: "High", date: new Date().toISOString().slice(0, 10) });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function refresh() {
    if (!user) return;
    setEvents(await listEconomicEvents(user.uid));
  }

  async function handleSync() {
    if (!user) return;
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/economic-calendar/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      setSyncMessage(data?.message ?? "Could not reach the calendar sync service.");
      if (res.ok) refresh();
    } catch {
      setSyncMessage("Could not reach the calendar sync service. Check your FINNHUB_API_KEY setup.");
    } finally {
      setSyncLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleAdd() {
    if (!user || !form.title || !form.date) return;
    const event: EconomicEvent = {
      id: crypto.randomUUID(),
      date: form.date,
      time: form.time ?? "",
      title: form.title,
      impact: (form.impact as EconomicEvent["impact"]) ?? "Medium",
      notes: form.notes
    };
    await saveEconomicEvent(user.uid, event);
    setForm({ impact: "High", date: new Date().toISOString().slice(0, 10) });
    refresh();
  }

  async function handleDelete(id: string) {
    if (!user) return;
    await deleteEconomicEvent(user.uid, id);
    refresh();
  }

  const impactTone = { High: "loss", Medium: "gold", Low: "neutral" } as const;

  return (
    <AppShell eyebrow="News & Events" title="Economic Calendar">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={handleSync} disabled={syncLoading}>
          {syncLoading ? "Syncing…" : "Sync Gold Calendar"}
        </Button>
        {syncMessage && <div className="text-xs text-muted">{syncMessage}</div>}
      </div>

      <Card className="mb-5 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Input type="date" value={form.date ?? ""} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <Input type="time" value={form.time ?? ""} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} placeholder="Time" />
          <Input
            className="sm:col-span-2"
            value={form.title ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. US CPI, FOMC Rate Decision, NFP"
          />
          <Select value={form.impact} onChange={(e) => setForm((f) => ({ ...f, impact: e.target.value as any }))}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </Select>
        </div>
        <Button onClick={handleAdd} className="mt-3">Add Event</Button>
      </Card>

      <div className="space-y-2">
        {events.map((e) => (
          <Card key={e.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-4">
              <div className="font-mono text-xs text-muted">{e.date} {e.time}</div>
              <div className="text-sm text-ink">{e.title}</div>
              <Badge tone={impactTone[e.impact]}>{e.impact} Impact</Badge>
            </div>
            <button onClick={() => handleDelete(e.id)} className="text-xs text-faint hover:text-loss">Remove</button>
          </Card>
        ))}
        {events.length === 0 && (
          <div className="py-10 text-center text-sm text-faint">
            No events logged. Add high-impact releases (CPI, NFP, FOMC) that affect gold volatility.
          </div>
        )}
      </div>
    </AppShell>
  );
}
