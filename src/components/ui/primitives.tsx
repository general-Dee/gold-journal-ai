"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-lg border border-line bg-surface shadow-card", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-line px-5 py-4">
      <div>
        {eyebrow && (
          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">{eyebrow}</div>
        )}
        <h3 className="font-display text-[15px] font-medium text-ink">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gold text-bg hover:bg-gold-bright",
    ghost: "border border-line text-ink hover:border-gold-dim hover:text-gold-bright bg-transparent",
    danger: "border border-loss/40 text-loss hover:bg-loss/10 bg-transparent"
  };
  return <button className={cx(base, variants[variant], className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-gold-dim focus:outline-none focus:ring-1 focus:ring-gold-dim",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-gold-dim focus:outline-none focus:ring-1 focus:ring-gold-dim",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink focus:border-gold-dim focus:outline-none focus:ring-1 focus:ring-gold-dim",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{children}</label>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "profit" | "loss" | "gold" }) {
  const tones = {
    neutral: "bg-raised text-muted border-line",
    profit: "bg-profit/10 text-profit border-profit/30",
    loss: "bg-loss/10 text-loss border-loss/30",
    gold: "bg-gold/10 text-gold-bright border-gold-dim/50"
  };
  return (
    <span className={cx("inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide", tones[tone])}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, tone = "neutral", sub }: { label: string; value: string; tone?: "neutral" | "profit" | "loss"; sub?: string }) {
  const toneColor = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-ink";
  return (
    <Card className="px-5 py-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className={cx("mt-2 font-display text-2xl font-medium tabular-nums", toneColor)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
}
