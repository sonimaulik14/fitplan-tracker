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
          <div className="absolute right-0 mt-2 w-64 z-50 rounded-2xl border border-border-strong bg-surface-solid p-2 shadow-2xl animate-scale-in origin-top-right">
            {/* header */}
            <div className="flex items-center gap-3 p-2">
              <Avatar name={name} src={avatarUrl} size={40} />
              <div className="min-w-0">
                <div className="font-semibold truncate">{name}</div>
                <div className="text-xs text-muted truncate">{email}</div>
              </div>
            </div>

            <div className="h-px bg-border my-1.5" />

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
            <MenuLink
              href="/plans"
              onClick={() => setOpen(false)}
              icon="switch"
            >
              Switch program
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
                        ? "bg-accent text-[#ffffff]"
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
  return (
    <svg {...common} className="shrink-0">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
