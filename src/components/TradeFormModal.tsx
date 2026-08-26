"use client";

import { useState } from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { calculateTradePnl } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { uploadTradeScreenshot } from "@/lib/data";
import { TradeSchema } from "@/lib/schemas";
import type { Direction, MistakeTag, Session, SetupType, Trade } from "@/lib/types";

const SESSIONS: Session[] = ["Asian", "London", "New York", "Overlap"];
const SETUPS: SetupType[] = ["Trend Continuation", "Reversal", "Range Breakout", "Liquidity Sweep", "News Fade", "Support/Resistance", "Other"];
const MISTAKES: MistakeTag[] = ["None", "Revenge Trade", "Early Entry", "Late Entry", "Moved Stop", "Oversized", "No Setup", "FOMO", "Ignored Checklist"];

export function TradeFormModal({
  initial,
  onClose,
  onSave
}: {
  initial?: Trade;
  onClose: () => void;
  onSave: (trade: Trade) => Promise<void>;
}) {
  const { user } = useAuth();
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Trade>>(
    initial ?? {
      date: new Date().toISOString().slice(0, 10),
      direction: "Long",
      lotSize: 0.1,
      session: "New York",
      setupType: "Trend Continuation",
      mistakeTag: "None",
      emotionBefore: 3,
      emotionDuring: 3,
      emotionAfter: 3,
      notes: ""
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Trade>(key: K, value: Trade[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleScreenshotChange(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    const entry = form.entryPrice ?? 0;
    const exit = form.exitPrice ?? 0;
    const stop = form.stopLoss ?? 0;
    const lot = form.lotSize ?? 0;

    if (!entry || !exit || !stop || !lot) {
      setError("Entry price, exit price, stop loss, and lot size are required and must be non-zero.");
      return;
    }

    const direction: Direction = (form.direction as Direction) ?? "Long";
    const { pnl, riskAmount, rMultiple } = calculateTradePnl({ direction, entryPrice: entry, exitPrice: exit, stopLoss: stop, lotSize: lot });

    const id = initial?.id ?? crypto.randomUUID();
    const trade: Trade = {
      id,
      date: form.date ?? new Date().toISOString().slice(0, 10),
      direction,
      entryPrice: entry,
      exitPrice: exit,
      stopLoss: stop,
      takeProfit: form.takeProfit,
      lotSize: lot,
      session: (form.session as Session) ?? "New York",
      setupType: (form.setupType as SetupType) ?? "Other",
      mistakeTag: (form.mistakeTag as MistakeTag) ?? "None",
      riskAmount,
      pnl,
      rMultiple,
      emotionBefore: form.emotionBefore ?? 3,
      emotionDuring: form.emotionDuring ?? 3,
      emotionAfter: form.emotionAfter ?? 3,
      notes: form.notes ?? "",
      screenshotUrl: form.screenshotUrl,
      createdAt: initial?.createdAt ?? Date.now()
    };

    const result = TradeSchema.safeParse(trade);
    if (!result.success) {
      const issue = result.error.issues[0];
      setError(`${issue.path.join(".") || "Form"}: ${issue.message}`);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      if (pendingDataUrl && user) {
        trade.screenshotUrl = await uploadTradeScreenshot(user.uid, id, pendingDataUrl);
      }
      await onSave(trade);
    } catch {
      setError("Could not save this trade. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 font-display text-lg font-medium text-ink">{initial ? "Edit Trade" : "Log New Trade"}</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value as any)} />
          </div>
          <div>
            <Label>Direction</Label>
            <Select value={form.direction} onChange={(e) => update("direction", e.target.value as Direction)}>
              <option value="Long">Long</option>
              <option value="Short">Short</option>
            </Select>
          </div>

          <div>
            <Label>Entry Price</Label>
            <Input type="number" step="0.01" value={form.entryPrice ?? ""} onChange={(e) => update("entryPrice", parseFloat(e.target.value) as any)} placeholder="2385.40" />
          </div>
          <div>
            <Label>Exit Price</Label>
            <Input type="number" step="0.01" value={form.exitPrice ?? ""} onChange={(e) => update("exitPrice", parseFloat(e.target.value) as any)} placeholder="2391.20" />
          </div>

          <div>
            <Label>Stop Loss</Label>
            <Input type="number" step="0.01" value={form.stopLoss ?? ""} onChange={(e) => update("stopLoss", parseFloat(e.target.value) as any)} placeholder="2381.00" />
          </div>
          <div>
            <Label>Take Profit (optional)</Label>
            <Input type="number" step="0.01" value={form.takeProfit ?? ""} onChange={(e) => update("takeProfit", parseFloat(e.target.value) as any)} placeholder="2396.00" />
          </div>

          <div>
            <Label>Lot Size</Label>
            <Input type="number" step="0.01" value={form.lotSize ?? ""} onChange={(e) => update("lotSize", parseFloat(e.target.value) as any)} />
          </div>
          <div>
            <Label>Session</Label>
            <Select value={form.session} onChange={(e) => update("session", e.target.value as Session)}>
              {SESSIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Setup Type</Label>
            <Select value={form.setupType} onChange={(e) => update("setupType", e.target.value as SetupType)}>
              {SETUPS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Mistake Tag</Label>
            <Select value={form.mistakeTag} onChange={(e) => update("mistakeTag", e.target.value as MistakeTag)}>
              {MISTAKES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <Label>Emotion Before (1-5)</Label>
            <Input type="number" min={1} max={5} value={form.emotionBefore} onChange={(e) => update("emotionBefore", parseInt(e.target.value) as any)} />
          </div>
          <div>
            <Label>Emotion During (1-5)</Label>
            <Input type="number" min={1} max={5} value={form.emotionDuring} onChange={(e) => update("emotionDuring", parseInt(e.target.value) as any)} />
          </div>
          <div>
            <Label>Emotion After (1-5)</Label>
            <Input type="number" min={1} max={5} value={form.emotionAfter} onChange={(e) => update("emotionAfter", parseInt(e.target.value) as any)} />
          </div>
        </div>

        <div className="mt-4">
          <Label>Notes</Label>
          <Textarea rows={4} value={form.notes} onChange={(e) => update("notes", e.target.value as any)} placeholder="What was the setup? What did you see? What would you do differently?" />
        </div>

        <div className="mt-4">
          <Label>Screenshot (optional)</Label>
          {(pendingDataUrl ?? form.screenshotUrl) && (
            // eslint-disable-next-line @next/next/no-img-element -- previews an unsaved local file via a data: URL, which next/image can't render
            <img
              src={pendingDataUrl ?? form.screenshotUrl}
              alt="Trade screenshot preview"
              className="mb-2 max-h-40 rounded-md border border-line"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleScreenshotChange(e.target.files?.[0])}
            className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink file:mr-3 file:rounded file:border-0 file:bg-line file:px-3 file:py-1 file:text-xs file:text-ink"
          />
          {form.screenshotUrl && !pendingDataUrl && <div className="mt-1 text-xs text-faint">Choose a new file to replace the current screenshot.</div>}
        </div>

        {error && <div className="mt-4 text-sm text-loss">{error}</div>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving…" : "Save Trade"}</Button>
        </div>
      </div>
    </div>
  );
}
