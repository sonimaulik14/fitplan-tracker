"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";

type Wk = { number: number; style: string | null; completed: boolean };

// Hoisted out of the component so it isn't recreated on every render.
function Arrow({ to, dir }: { to?: Wk; dir: "l" | "r" }) {
  const Icon = dir === "l" ? ChevronLeft : ChevronRight;
  return to ? (
    <Link
      href={`/dashboard?week=${to.number}`}
      scroll={false}
      aria-label={dir === "l" ? "Previous week" : "Next week"}
      className="grid place-items-center w-9 h-9 rounded-lg border border-border bg-surface-2 text-muted hover:text-foreground hover:border-border-strong active:scale-95 transition-all"
    >
      <Icon size={16} aria-hidden />
    </Link>
  ) : (
    <span className="grid place-items-center w-9 h-9 rounded-lg border border-border/50 text-muted/30 select-none">
      <Icon size={16} aria-hidden />
    </span>
  );
}

export default function WeekSwitcher({
  weeks,
  selected,
  current,
}: {
  weeks: Wk[];
  selected: number;
  current: number;
}) {
  const [open, setOpen] = useState(false);
  const sorted = [...weeks].sort((a, b) => a.number - b.number);
  const sel = sorted.find((w) => w.number === selected) ?? sorted[0];
  const prev = [...sorted].reverse().find((w) => w.number < selected);
  const next = sorted.find((w) => w.number > selected);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex items-center gap-2">
      <Arrow to={prev} dir="l" />

      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-2.5 pl-3.5 pr-2.5 h-9 rounded-xl border border-border bg-surface-2 hover:border-border-strong transition-colors"
        >
          <span className="font-display font-bold text-sm whitespace-nowrap">
            Week {sel?.number}
            {sel?.style ? <span className="text-accent"> · {sel.style}</span> : null}
          </span>
          {sel?.number === current && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-accent bg-accent/12 rounded px-1.5 py-0.5">
              Current
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {open && (
          <>
            <button
              className="fixed inset-0 z-40 cursor-default"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              role="listbox"
              className="absolute left-0 mt-2 w-60 max-h-80 overflow-auto z-50 rounded-xl border border-border-strong bg-surface-solid p-1.5 shadow-2xl animate-scale-in origin-top-left"
            >
              {sorted.map((w) => {
                const isSel = w.number === selected;
                return (
                  <Link
                    key={w.number}
                    href={`/dashboard?week=${w.number}`}
                    scroll={false}
                    onClick={() => setOpen(false)}
                    role="option"
                    aria-selected={isSel}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isSel
                        ? "bg-accent/12 text-foreground ring-1 ring-inset ring-accent/25"
                        : "hover:bg-surface-2 text-muted hover:text-foreground"
                    }`}
                  >
                    <span className="font-medium">
                      Week {w.number}
                      {w.style ? (
                        <span className="text-accent"> · {w.style}</span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {w.number === current && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          Current
                        </span>
                      )}
                      {w.completed && (
                        <span className="grid place-items-center w-4 h-4 rounded-full bg-accent-2 text-[#05231a]">
                          <Check size={11} strokeWidth={3} aria-hidden />
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Arrow to={next} dir="r" />
    </div>
  );
}
