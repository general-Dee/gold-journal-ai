"use client";

import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Badge, StatCard, Button } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth-context";
import { listTrades, getRiskSettings, getChecklist } from "@/lib/data";
import { calculateStats, buildEquityCurve, buildDrawdownCurve, breakdownBySession, breakdownBySetup, formatCurrency, todayId } from "@/lib/utils";
import type { Trade, RiskSettings } from "@/lib/types";
import Link from "next/link";

function getSessionInfo() {
  const utcHour = new Date().getUTCHours();
  if (utcHour >= 0 && utcHour < 7) return { name: "Asian", note: "Typically lower volatility. Range formation common." };
  if (utcHour >= 7 && utcHour < 12) return { name: "London", note: "Volatility expansion. Watch the London open sweep." };
  if (utcHour >= 12 && utcHour < 16) return { name: "London/NY Overlap", note: "Highest liquidity window of the day." };
  if (utcHour >= 16 && utcHour < 21) return { name: "New York", note: "Trend continuation or reversal off overlap moves." };
  return { name: "Late NY / Pre-Asian", note: "Thin liquidity. Spreads can widen." };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [risk, setRisk] = useState<RiskSettings | null>(null);
  const [checklistComplete, setChecklistComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const session = getSessionInfo();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = todayId();
      const [t, r, c] = await Promise.all([
        listTrades(user.uid),
        getRiskSettings(user.uid),
        getChecklist(user.uid, today)
      ]);
      setTrades(t);
      setRisk(r);
      setChecklistComplete(!!c?.completedAt);
      setLoading(false);
    })();
  }, [user]);

  const startingBalance = risk?.accountBalance ?? 10000;
  const stats = useMemo(() => calculateStats(trades), [trades]);
  const equityCurve = useMemo(() => buildEquityCurve(trades, startingBalance), [trades, startingBalance]);
  const drawdownCurve = useMemo(() => buildDrawdownCurve(trades, startingBalance), [trades, startingBalance]);
  const sessionBreakdown = useMemo(() => breakdownBySession(trades), [trades]);
  const setupBreakdown = useMemo(() => breakdownBySetup(trades), [trades]);

  const today = todayId();
  const todaysTrades = trades.filter((t) => t.date === today);
  const todaysPnl = todaysTrades.reduce((s, t) => s + t.pnl, 0);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekPnl = trades.filter((t) => t.createdAt >= weekAgo).reduce((s, t) => s + t.pnl, 0);

  const maxDailyLoss = risk ? risk.accountBalance * (risk.maxDailyLossPct / 100) : 0;
  const maxWeeklyLoss = risk ? risk.accountBalance * (risk.maxWeeklyLossPct / 100) : 0;
  const dailyLocked = risk && todaysPnl <= -maxDailyLoss;
  const weeklyLocked = risk && weekPnl <= -maxWeeklyLoss;

  return (
    <AppShell eyebrow="Overview" title="Dashboard">
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

      {!checklistComplete && !loading && (
        <Card className="mb-5 border-gold-dim/40 bg-gold/5 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-bright">Pre-market checklist incomplete</div>
              <p className="mt-1 text-sm text-muted">Complete today's checklist before trading.</p>
            </div>
            <Link href="/checklist">
              <Button variant="ghost" className="text-xs">Open checklist</Button>
            </Link>
          </div>
        </Card>
      )}

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
              {risk && (
                <div className="mt-2 text-xs text-faint">
                  Daily limit: {formatCurrency(-maxDailyLoss)} · Weekly: {formatCurrency(-maxWeeklyLoss)}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {drawdownCurve.length > 0 && (
        <Card className="mb-6">
          <CardHeader eyebrow="Risk" title="Drawdown" />
          <div className="h-48 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownCurve}>
                <CartesianGrid stroke="#262B33" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#5A5F68", fontSize: 11 }} axisLine={{ stroke: "#262B33" }} tickLine={false} />
                <YAxis tick={{ fill: "#5A5F68", fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "#1B1F26", border: "1px solid #262B33", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string) => [name === "drawdown" ? formatCurrency(v) : `${v}%`, name === "drawdown" ? "Drawdown" : "Drawdown %"]}
                />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} fill="#ef4444" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="By Session" title="Session Performance" />
          <div className="h-56 px-4 py-4">
            {sessionBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionBreakdown}>
                  <CartesianGrid stroke="#262B33" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#5A5F68", fontSize: 11 }} axisLine={{ stroke: "#262B33" }} tickLine={false} />
                  <YAxis tick={{ fill: "#5A5F68", fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#1B1F26", border: "1px solid #262B33", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [formatCurrency(v), "P&L"]}
                  />
                  <Bar dataKey="totalPnl" radius={[4, 4, 0, 0]}>
                    {sessionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.totalPnl >= 0 ? "#22c55e" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-faint">Not enough data yet.</div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="By Setup" title="Setup Performance" />
          <div className="h-56 px-4 py-4">
            {setupBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setupBreakdown} layout="vertical">
                  <CartesianGrid stroke="#262B33" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#5A5F68", fontSize: 11 }} axisLine={{ stroke: "#262B33" }} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="label" tick={{ fill: "#5A5F68", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ background: "#1B1F26", border: "1px solid #262B33", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [formatCurrency(v), "P&L"]}
                  />
                  <Bar dataKey="totalPnl" radius={[0, 4, 4, 0]}>
                    {setupBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.totalPnl >= 0 ? "#22c55e" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-faint">Not enough data yet.</div>
            )}
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
