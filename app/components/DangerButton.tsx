"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";

// A button that opens a confirmation dialog before running a destructive action.
// Reused for "reset day" and "reset program".
export default function DangerButton({
  label,
  title,
  message,
  confirmLabel = "Reset",
  onConfirm,
  className,
}: {
  label: React.ReactNode;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const confirm = () =>
    start(async () => {
      await onConfirm();
      setOpen(false);
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/20 transition-colors"
        }
      >
        {label}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4"
          >
            <button
              type="button"
              aria-label="Close"
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !pending && setOpen(false)}
            />
            <div className="relative z-10 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-border-strong bg-surface-solid shadow-2xl p-6 animate-fade-up">
              <div className="text-3xl">⚠️</div>
              <h2 className="font-display text-lg font-bold mt-2">{title}</h2>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                {message}
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  className="btn-ghost flex-1"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={pending}
                  className="flex-1 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 active:scale-[0.98] transition-transform"
                  style={{ background: "var(--danger)" }}
                >
                  {pending ? "Resetting…" : confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
