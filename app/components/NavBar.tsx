"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Unit } from "@/lib/ui";
import ProfileMenu from "./ProfileMenu";
import CommandPalette from "./CommandPalette";
import VajraMark from "./VajraMark";

const LINKS = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/plan", label: "Plan", icon: ListIcon },
  { href: "/coach", label: "Coach", icon: CoachIcon },
  { href: "/progress", label: "Progress", icon: FireIcon },
  { href: "/analysis", label: "Stats", icon: ChartIcon },
  { href: "/nutrition", label: "Nutrition", icon: NutritionIcon },
];

type NavUser = {
  name: string;
  email: string;
  unit?: string;
  avatarUrl?: string | null;
};

export default function NavBar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const unit: Unit = user.unit === "lb" ? "lb" : "kg";
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Top bar — solid so scrolling content never shows through it */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-2xl shadow-[0_8px_30px_-24px_rgba(0,0,0,0.8)] pt-[env(safe-area-inset-top)]">
        <nav className="max-w-5xl mx-auto px-4 sm:px-5 h-[72px] sm:h-16 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="grid place-items-center w-8 h-8 rounded-xl brand-bg shadow-lg shadow-accent/30">
              <VajraMark size={22} />
            </span>
            <span className="font-display font-bold text-lg tracking-tight">
              Vajra
            </span>
          </Link>

          {/* desktop nav pills */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-surface-2 border border-border">
            {LINKS.map((l) => {
              const Icon = l.icon;
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? "bg-accent/15 text-foreground ring-1 ring-inset ring-accent/30"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Icon active={active} />
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* mobile: icon-only search → opens the command palette */}
            <button
              onClick={() => window.dispatchEvent(new Event("fitplan:command"))}
              aria-label="Search"
              className="sm:hidden grid place-items-center w-9 h-9 rounded-xl border border-border bg-surface-2 text-muted active:scale-95 transition-transform"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={() =>
                window.dispatchEvent(new Event("fitplan:command"))
              }
              aria-label="Search (Cmd/Ctrl + K)"
              className="hidden sm:flex items-center gap-2 h-9 pl-2.5 pr-2 rounded-xl border border-border bg-surface-2 text-muted hover:text-foreground hover:border-border-strong transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <kbd className="text-[10px] border border-border rounded px-1 py-0.5">
                ⌘K
              </kbd>
            </button>
            <ProfileMenu
              name={user.name}
              email={user.email}
              avatarUrl={user.avatarUrl}
              unit={unit}
            />
          </div>
        </nav>
      </header>

      <CommandPalette />

      {/* Mobile "Start workout" FAB — floats above the tab bar */}
      <Link
        href="/workout/next"
        aria-label="Start today's workout"
        className="md:hidden fixed left-1/2 -translate-x-1/2 bottom-[calc(60px+env(safe-area-inset-bottom))] z-40 grid place-items-center w-14 h-14 rounded-full text-white active:scale-95 transition-transform ring-4 ring-background"
        style={{
          background: "var(--accent)",
          boxShadow: "0 8px 24px -10px rgba(0,0,0,0.6)",
        }}
      >
        <DumbbellIcon />
      </Link>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-6">
          {LINKS.map((l) => {
            const Icon = l.icon;
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex flex-col items-center justify-center gap-1 py-3.5 text-[11px] font-semibold transition-colors ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon active={active} />
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

function DumbbellIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ListIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CoachIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7}
        strokeLinejoin="round"
      />
      <path
        d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function FireIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3c.5 3-2 4.5-2 7a2 2 0 1 0 4 0c0-.6-.2-1.2-.5-1.7C16 10 18 12.5 18 15a6 6 0 1 1-12 0c0-3.5 3-5.5 4-9 .6.8 1.4 1.2 2-3Z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChartIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20V10M10 20V4M16 20v-7M22 20H2"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function NutritionIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7}
        strokeLinejoin="round"
      />
      <path
        d="M10 2c1 .5 2 2 2 5"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7}
        strokeLinecap="round"
      />
    </svg>
  );
}
