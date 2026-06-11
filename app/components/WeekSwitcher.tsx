"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { termInfo } from "@/lib/ui";
import InfoTip from "./InfoTip";

type Wk = { number: number; style: string | null; completed: boolean };

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

  const Arrow = ({ to, dir }: { to?: Wk; dir: "l" | "r" }) =>
    to ? (
      <Link
        href={`/dashboard?week=${to.number}`}
        scroll={false}
        aria-label={dir === "l" ? "Previous week" : "Next week"}
        className="grid place-items-center w-8 h-8 rounded-lg border border-border bg-surface-2 text-muted hover:text-foreground hover:border-border-strong transition-colors"
      >
        {dir === "l" ? "‹" : "›"}
      </Link>
    ) : (
      <span className="grid place-items-center w-8 h-8 rounded-lg border border-border/50 text-muted/40 select-none">
        {dir === "l" ? "‹" : "›"}
      </span>
    );

  return (
    <div className="flex items-center gap-2">
      <Arrow to={prev} dir="l" />

      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 h-9 rounded-xl border border-border bg-surface-2 hover:border-border-strong transition-colors"
        >
          <span className="font-display font-bold">
            Week {sel?.number}
            {sel?.style ? (
              <span className="text-accent"> : {sel.style}</span>
            ) : null}
          </span>
          {sel?.number === current && (
            <span className="text-[10px] uppercase tracking-wide text-muted">
              current
            </span>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <>
            <button
              className="fixed inset-0 z-40 cursor-default"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 mt-2 w-56 max-h-80 overflow-auto z-50 card p-1.5 shadow-2xl animate-scale-in origin-top-left">
              {sorted.map((w) => (
                <Link
                  key={w.number}
                  href={`/dashboard?week=${w.number}`}
                  scroll={false}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    w.number === selected
                      ? "bg-accent/10 text-foreground"
                      : "hover:bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  <span>
                    Week {w.number}
                    {w.style ? (
                      <span className="text-accent"> : {w.style}</span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {w.number === current && (
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        current
                      </span>
                    )}
                    {w.completed && (
                      <span className="grid place-items-center w-4 h-4 rounded-full bg-accent-2 text-[#05231a] text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <Arrow to={next} dir="r" />

      {sel?.style &&
        (() => {
          const info = termInfo(sel.style);
          return info ? (
            <InfoTip
              title={info.title}
              desc={info.desc}
              className="text-muted hover:text-foreground"
            >
              <span className="sr-only">{info.title}</span>
            </InfoTip>
          ) : null;
        })()}
    </div>
  );
}
