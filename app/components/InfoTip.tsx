"use client";

import { useState } from "react";
import Sheet from "./Sheet";

// Tap-to-open explainer. Mobile bottom sheet / desktop centered card — solid
// (not glassy) and scroll-proof. Behavior (portal, focus trap, Escape) comes
// from <Sheet>.
export default function InfoTip({
  title,
  desc,
  children,
  className = "",
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`What is ${title}?`}
        className={`inline-flex items-center gap-1 align-middle ${className}`}
      >
        {children}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="opacity-70 shrink-0"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="7.6" r="1.1" fill="currentColor" />
        </svg>
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel={title}
        panelClassName="w-full sm:max-w-xs rounded-t-2xl sm:rounded-xl border border-border-strong bg-surface-solid shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-left normal-case tracking-normal"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-base text-foreground">{title}</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="-mr-1 -mt-1 grid place-items-center w-8 h-8 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-muted mt-2 leading-relaxed font-normal">{desc}</p>
      </Sheet>
    </>
  );
}
