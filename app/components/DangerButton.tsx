"use client";

import { useState, useTransition } from "react";
import Sheet from "./Sheet";

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
  const [pending, start] = useTransition();

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

      <Sheet
        open={open}
        onClose={() => !pending && setOpen(false)}
        ariaLabel={title}
        dismissible={!pending}
        panelClassName="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-border-strong bg-surface-solid shadow-2xl px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="text-3xl">⚠️</div>
        <h2 className="font-display text-lg font-bold mt-2">{title}</h2>
        <p className="text-sm text-muted mt-1.5 leading-relaxed">{message}</p>
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
      </Sheet>
    </>
  );
}
