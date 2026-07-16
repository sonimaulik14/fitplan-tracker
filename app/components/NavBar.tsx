"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Unit } from "@/lib/ui";
import ProfileMenu from "./ProfileMenu";
import CommandPalette from "./CommandPalette";
import TabBar from "./TabBar";
import VajraMark from "./VajraMark";
import { HomeIcon, ListIcon, FireIcon, ChartIcon } from "./nav-icons";

const LINKS = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/plan", label: "Plan", icon: ListIcon },
  { href: "/progress", label: "Progress", icon: FireIcon },
  { href: "/analysis", label: "Stats", icon: ChartIcon },
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
      {/* Top bar — flat machined strip; mobile keeps it slim (tabs live below) */}
      <header className="sticky top-0 z-30 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
        <nav className="max-w-5xl mx-auto px-4 sm:px-5 h-14 sm:h-16 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="grid place-items-center w-8 h-8 rounded-lg brand-bg">
              <VajraMark size={22} />
            </span>
            <span className="font-display font-bold text-lg uppercase tracking-wide">
              Vajra
            </span>
          </Link>

          {/* desktop nav — ember underline marks the active section */}
          <div className="hidden md:flex items-center gap-1 h-full">
            {LINKS.map((l) => {
              const Icon = l.icon;
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-2 px-3.5 h-full text-sm font-semibold transition-colors ${
                    active ? "text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  <Icon active={active} />
                  {l.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* mobile: icon-only search → opens the command palette */}
            <button
              onClick={() => window.dispatchEvent(new Event("vajra:command"))}
              aria-label="Search"
              className="sm:hidden grid place-items-center w-9 h-9 rounded-lg border border-border bg-surface-2 text-muted active:scale-95 transition-transform"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={() =>
                window.dispatchEvent(new Event("vajra:command"))
              }
              aria-label="Search (Cmd/Ctrl + K)"
              className="hidden sm:flex items-center gap-2 h-9 pl-2.5 pr-2 rounded-lg border border-border bg-surface-2 text-muted hover:text-foreground hover:border-border-strong transition-colors"
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
      <TabBar />
    </>
  );
}
