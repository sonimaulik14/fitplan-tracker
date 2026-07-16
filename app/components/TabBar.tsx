"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ListIcon, FireIcon, ChartIcon, DumbbellIcon } from "./nav-icons";

// Mobile bottom navigation — five thumb-zone slots with the Train action as a
// raised ember tile in the center. Hidden inside the workout flow: gym mode
// owns the bottom edge (rest bar + action bar live there).

const LEFT = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/plan", label: "Plan", icon: ListIcon },
];
const RIGHT = [
  { href: "/progress", label: "Progress", icon: FireIcon },
  { href: "/analysis", label: "Stats", icon: ChartIcon },
];

export default function TabBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/workout/")) return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const tab = (l: (typeof LEFT)[number]) => {
    const Icon = l.icon;
    const active = isActive(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
          active ? "text-accent" : "text-muted"
        }`}
      >
        <Icon active={active} />
        {l.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-[var(--tabbar-h)]">
        {LEFT.map(tab)}
        {/* Train — the one colored action on the bar */}
        <div className="relative">
          <Link
            href="/workout/next"
            aria-label="Start today's workout"
            className="absolute left-1/2 -translate-x-1/2 -top-4 grid place-items-center w-[52px] h-[52px] rounded-xl brand-bg active:scale-95 transition-transform shadow-[0_10px_22px_-10px_rgba(0,0,0,0.65)]"
          >
            <DumbbellIcon size={24} />
          </Link>
          <span className="absolute inset-x-0 bottom-[9px] text-center text-[11px] font-semibold text-muted">
            Train
          </span>
        </div>
        {RIGHT.map(tab)}
      </div>
    </nav>
  );
}
