"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cx } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", code: "01" },
  { href: "/journal", label: "Trade Journal", code: "02" },
  { href: "/checklist", label: "Pre-Market", code: "03" },
  { href: "/risk", label: "Risk Calculator", code: "04" },
  { href: "/playbook", label: "Playbook", code: "05" },
  { href: "/psychology", label: "Psychology", code: "06" },
  { href: "/calendar", label: "Calendar", code: "07" }
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="border-b border-line px-5 py-5">
        <div className="font-display text-[17px] font-semibold tracking-tight text-ink">
          Gold<span className="text-gold-bright">Journal</span>
        </div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">XAUUSD Desk</div>
      </div>

      <nav className="flex-1 py-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "group relative flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                active ? "text-gold-bright" : "text-muted hover:text-ink"
              )}
            >
              <span
                className={cx(
                  "absolute left-0 top-0 h-full w-[2px] bg-gold transition-opacity",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-30"
                )}
              />
              <span className="font-mono text-[10px] text-faint">{item.code}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <div className="mb-2 truncate text-xs text-muted">{user?.email}</div>
        <button
          onClick={() => logout()}
          className="font-mono text-[11px] uppercase tracking-wide text-faint transition-colors hover:text-loss"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
