"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth-context";
import { getRiskSettings, saveRiskSettings, listTrades } from "@/lib/data";
import { calculatePositionSize, formatCurrency, todayId } from "@/lib/utils";
import type { RiskSettings, Trade } from "@/lib/types";

const DEFAULTS: RiskSettings = {
  accountBalance: 10000,
  riskPerTradePct: 1,
  maxDailyLossPct: 3,
  maxWeeklyLossPct: 6
};

export default function RiskPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<RiskSettings>(DEFAULTS);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [entryPrice, setEntryPrice] = useState(2385.4);
  const [stopLoss, setStopLoss] = useState(2379.4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, t] = await Promise.all([getRiskSettings(user.uid), listTrades(user.uid)]);
      if (s) setSettings(s);
      setTrades(t);
    })();
  }, [user]);

  const result = useMemo(
    () =>
      calculatePositionSize({
        accountBalance: settings.accountBalance,
        riskPct: settings.riskPerTradePct,
        entryPrice,
        stopLoss
      }),
    [settings, entryPrice, stopLoss]
  );

  const today = todayId();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const todaysPnl = trades.filter((t) => t.date === today).reduce((s, t) => s + t.pnl, 0);
  const weekPnl = trades.filter((t) => t.createdAt >= weekAgo).reduce((s, t) => s + t.pnl, 0);

  const maxDailyLoss = settings.accountBalance * (settings.maxDailyLossPct / 100);
  const maxWeeklyLoss = settings.accountBalance * (settings.maxWeeklyLossPct / 100);
  const dailyLocked = todaysPnl <= -maxDailyLoss;
  const weeklyLocked = weekPnl <= -maxWeeklyLoss;

  async function handleSaveSettings() {
    if (!user) return;
    setSaving(true);
    await saveRiskSettings(user.uid, settings);
    setSaving(false);
  }

  return (
    <AppShell eyebrow="Position Sizing" title="Risk Calculator">
      {(dailyLocked || weeklyLocked) && (
        <Card className="mb-5 border-loss/40 bg-loss/5 px-5 py-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-loss">
            {weeklyLocked ? "Weekly loss limit reached" : "Daily loss limit reached"}
          </div>
          <p className="mt-1 text-sm text-ink">
            You have hit your {weeklyLocked ? "weekly" : "daily"} max loss threshold. Step away from the charts — this is the discipline framework working as intended.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Calculate" title="Position Size" />
          <div className="space-y-4 p-5">
            <div>
              <Label>Entry Price</Label>
              <Input type="number" step="0.01" value={entryPrice} onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Stop Loss Price</Label>
              <Input type="number" step="0.01" value={stopLoss} onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="rounded-md border border-gold-dim/40 bg-gold/5 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Risk Amount</div>
                  <div className="mt-1 font-display text-xl text-ink">{formatCurrency(result.riskAmount)}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Recommended Lot Size</div>
                  <div className="mt-1 font-display text-xl text-gold-bright">{result.lotSize.toFixed(2)}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted">Stop distance: {result.stopDistancePoints.toFixed(2)} points</div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Configure" title="Risk Settings" />
          <div className="space-y-4 p-5">
            <div>
              <Label>Account Balance (USD)</Label>
              <Input type="number" value={settings.accountBalance} onChange={(e) => setSettings((s) => ({ ...s, accountBalance: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Risk Per Trade (%)</Label>
              <Input type="number" step="0.1" value={settings.riskPerTradePct} onChange={(e) => setSettings((s) => ({ ...s, riskPerTradePct: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Max Daily Loss (%)</Label>
              <Input type="number" step="0.5" value={settings.maxDailyLossPct} onChange={(e) => setSettings((s) => ({ ...s, maxDailyLossPct: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Max Weekly Loss (%)</Label>
              <Input type="number" step="0.5" value={settings.maxWeeklyLossPct} onChange={(e) => setSettings((s) => ({ ...s, maxWeeklyLossPct: parseFloat(e.target.value) || 0 }))} />
            </div>
            <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
