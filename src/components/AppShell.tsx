"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppShell({ children, title, eyebrow }: { children: ReactNode; title: string; eyebrow: string }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <div className="flex-1">
          <div className="h-[3px] w-full animate-pulse bg-gold-fade" />
          <header className="border-b border-line px-8 py-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">{eyebrow}</div>
            <h1 className="mt-1 font-display text-2xl font-medium text-ink">{title}</h1>
          </header>
          <main className="px-8 py-7">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
