"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutAction, setUnitAction } from "@/lib/actions";
import { type Unit } from "@/lib/ui";
import { toast } from "@/lib/toast";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";

export default function ProfileMenu({
  name,
  email,
  avatarUrl,
  unit,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  unit: Unit;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const setUnit = (u: Unit) => {
    if (u === unit) return;
    start(async () => {
      await setUnitAction(u);
      toast(`Units set to ${u}`);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-surface-2 transition-colors"
        aria-label="Open profile menu"
      >
        <Avatar name={name} src={avatarUrl} size={32} />
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 z-50 max-h-[74vh] overflow-y-auto rounded-xl border border-border-strong bg-surface-solid p-2 shadow-2xl animate-scale-in origin-top-right">
            {/* header */}
            <div className="flex items-center gap-3 p-2">
              <Avatar name={name} src={avatarUrl} size={40} />
              <div className="min-w-0">
                <div className="font-semibold truncate">{name}</div>
                <div className="text-xs text-muted truncate">{email}</div>
              </div>
            </div>

            <div className="h-px bg-border my-1.5" />

            <div className="eyebrow px-3 pt-1 pb-0.5">Program</div>
            <MenuLink href="/timeline" onClick={() => setOpen(false)} icon="calendar">
              Timeline
            </MenuLink>
            <MenuLink href="/targets" onClick={() => setOpen(false)} icon="target">
              This week&apos;s targets
            </MenuLink>
            <MenuLink href="/library" onClick={() => setOpen(false)} icon="book">
              Exercise library
            </MenuLink>
            <MenuLink href="/plans" onClick={() => setOpen(false)} icon="switch">
              Switch program
            </MenuLink>

            <div className="h-px bg-border my-1.5" />

            <div className="eyebrow px-3 pt-1 pb-0.5">Body</div>
            <MenuLink href="/measurements" onClick={() => setOpen(false)} icon="ruler">
              Measurements
            </MenuLink>
            <MenuLink href="/nutrition" onClick={() => setOpen(false)} icon="bowl">
              Nutrition
            </MenuLink>

            <div className="h-px bg-border my-1.5" />

            <div className="eyebrow px-3 pt-1 pb-0.5">Records</div>
            <MenuLink href="/history" onClick={() => setOpen(false)} icon="clock">
              Workout history
            </MenuLink>
            <MenuLink href="/records" onClick={() => setOpen(false)} icon="trophy">
              Personal records
            </MenuLink>
            <MenuLink href="/achievements" onClick={() => setOpen(false)} icon="medal">
              Achievements
            </MenuLink>

            <div className="h-px bg-border my-1.5" />

            <div className="eyebrow px-3 pt-1 pb-0.5">Account</div>
            <MenuLink href="/account" onClick={() => setOpen(false)} icon="user">
              Account
            </MenuLink>
            <MenuLink
              href="/onboarding"
              onClick={() => setOpen(false)}
              icon="sliders"
            >
              Training preferences
            </MenuLink>

            <div className="h-px bg-border my-1.5" />

            {/* theme */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-sm text-muted">Theme</span>
              <ThemeToggle />
            </div>
            {/* units */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-sm text-muted">Units</span>
              <div
                className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5 text-xs font-semibold"
                aria-busy={pending}
              >
                {(["kg", "lb"] as Unit[]).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      unit === u
                        ? "bg-accent text-accent-ink"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border my-1.5" />

            <form action={logoutAction}>
              <button className="btn-ghost w-full">
                <Icon name="logout" />
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-surface-2 transition-colors"
    >
      <Icon name={icon} />
      {children}
    </Link>
  );
}

function Icon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "text-muted shrink-0",
  };
  if (name === "user")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  if (name === "sliders")
    return (
      <svg {...common}>
        <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5" />
        <circle cx="16" cy="6" r="2" />
        <circle cx="8" cy="12" r="2" />
        <circle cx="13" cy="18" r="2" />
      </svg>
    );
  if (name === "switch")
    return (
      <svg {...common}>
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    );
  if (name === "calendar")
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    );
  if (name === "target")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.5" />
      </svg>
    );
  if (name === "book")
    return (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
        <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
      </svg>
    );
  if (name === "ruler")
    return (
      <svg {...common}>
        <rect x="2.5" y="9" width="19" height="6" rx="1.5" transform="rotate(-25 12 12)" />
        <path d="M8 13.5l1-2M12 11.5l1-2M16 9.5l1-2" />
      </svg>
    );
  if (name === "bowl")
    return (
      <svg {...common}>
        <path d="M4 11h16a8 8 0 0 1-16 0Z" />
        <path d="M9 8c0-2 1.5-2 1.5-4M13.5 8c0-2 1.5-2 1.5-4" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    );
  if (name === "trophy")
    return (
      <svg {...common}>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
        <path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4" />
        <path d="M12 13v4M8.5 21h7M10 17h4" />
      </svg>
    );
  if (name === "medal")
    return (
      <svg {...common}>
        <circle cx="12" cy="14" r="5" />
        <path d="M9 10 6 3M15 10l3-7M12 12.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 14.6l2-.3.9-1.8Z" />
      </svg>
    );
  return (
    <svg {...common} className="shrink-0">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
