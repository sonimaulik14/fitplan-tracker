"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/lib/useFocusTrap";

// Tap-to-open explainer. On mobile it's a bottom sheet, on desktop a small
// centered card — solid (not glassy) and it doesn't vanish when you scroll,
// which the old hover/positioned tooltip did.
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
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open && mounted);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
          className="opacity-70 shrink-0"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="7.6" r="1.1" fill="currentColor" />
        </svg>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4"
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              ref={dialogRef}
              tabIndex={-1}
              className="relative z-10 w-full sm:max-w-xs rounded-t-3xl sm:rounded-2xl border border-border-strong bg-surface-solid shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-fade-up text-left normal-case tracking-normal outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-base text-foreground">{title}</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="-mr-1 -mt-1 grid place-items-center w-8 h-8 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-muted mt-2 leading-relaxed font-normal">
                {desc}
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
