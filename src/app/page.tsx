"use client";

import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Badge, StatCard } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth-context";
import { listTrades, getRiskSettings } from "@/lib/data";
import { calculateStats, buildEquityCurve, formatCurrency, formatR } from "@/lib/utils";
import type { Trade } from "@/lib/types";

function getSessionInfo() {
  const utcHour = new Date().getUTCHours();
  // Approximate XAUUSD session windows (UTC)
  if (utcHour >= 0 && utcHour < 7) return { name: "Asian", note: "Typically lower volatility. Range formation common." };
  if (utcHour >= 7 && utcHour < 12) return { name: "London", note: "Volatility expansion. Watch the London open sweep." };
  if (utcHour >= 12 && utcHour < 16) return { name: "London/NY Overlap", note: "Highest liquidity window of the day." };
  if (utcHour >= 16 && utcHour < 21) return { name: "New York", note: "Trend continuation or reversal off overlap moves." };
  return { name: "Late NY / Pre-Asian", note: "Thin liquidity. Spreads can widen." };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [startingBalance, setStartingBalance] = useState(10000);
  const [loading, setLoading] = useState(true);
  const session = getSessionInfo();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [t, risk] = await Promise.all([listTrades(user.uid), getRiskSettings(user.uid)]);
      setTrades(t);
      if (risk) setStartingBalance(risk.accountBalance);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => calculateStats(trades), [trades]);
  const equityCurve = useMemo(() => buildEquityCurve(trades, startingBalance), [trades, startingBalance]);
  const today = new Date().toISOString().slice(0, 10);
  const todaysTrades = trades.filter((t) => t.date === today);
  const todaysPnl = todaysTrades.reduce((s, t) => s + t.pnl, 0);

  return (
    <AppShell eyebrow="Overview" title="Dashboard">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total P&L" value={formatCurrency(stats.totalPnl)} tone={stats.totalPnl >= 0 ? "profit" : "loss"} sub={`${stats.totalTrades} trades logged`} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
        <StatCard label="Profit Factor" value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)} />
        <StatCard
          label="Current Streak"
          value={stats.currentStreak === 0 ? "—" : `${stats.currentStreak} ${stats.streakType === "win" ? "W" : "L"}`}
          tone={stats.streakType === "win" ? "profit" : stats.streakType === "loss" ? "loss" : "neutral"}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader eyebrow="Performance" title="Equity Curve" />
          <div className="h-64 px-4 py-4">
            {equityCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurve}>
                  <defs>
                    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9A227" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#262B33" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#5A5F68", fontSize: 11 }} axisLine={{ stroke: "#262B33" }} tickLine={false} />
                  <YAxis tick={{ fill: "#5A5F68", fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#1B1F26", border: "1px solid #262B33", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#8B8F98" }}
                    formatter={(v: number) => [formatCurrency(v), "Balance"]}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#E4C455" strokeWidth={2} fill="url(#goldFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-faint">
                {loading ? "Loading…" : "Log your first trade to see your equity curve."}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Live" title="Session Clock" />
          <div className="px-5 py-4">
            <Badge tone="gold">{session.name}</Badge>
            <p className="mt-3 text-sm leading-relaxed text-muted">{session.note}</p>
            <div className="mt-5 border-t border-line pt-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Today</div>
              <div className={`mt-1 font-display text-xl font-medium tabular-nums ${todaysPnl > 0 ? "text-profit" : todaysPnl < 0 ? "text-loss" : "text-ink"}`}>
                {formatCurrency(todaysPnl)}
              </div>
              <div className="mt-0.5 text-xs text-muted">{todaysTrades.length} trade{todaysTrades.length === 1 ? "" : "s"} today</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="px-5 py-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Best Performing Setup</div>
          <div className="mt-2 font-display text-lg text-ink">{stats.bestSetup ?? "Not enough data yet"}</div>
        </Card>
        <Card className="px-5 py-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Weakest Setup</div>
          <div className="mt-2 font-display text-lg text-ink">{stats.worstSetup ?? "Not enough data yet"}</div>
        </Card>
      </div>
    </AppShell>
  );
}
