"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/lib/useFocusTrap";

/**
 * Shared modal/bottom-sheet shell. Owns the behavior every dialog needs —
 * portal, backdrop, `role="dialog"`/`aria-modal`, body-scroll lock, Escape to
 * dismiss, and focus trap/restore — while each caller styles its own panel via
 * `panelClassName` (so the visual layout stays bespoke).
 *
 * Bottom sheet on mobile (`items-end`), centered on desktop (`sm:items-center`).
 */
export default function Sheet({
  open,
  onClose,
  ariaLabel,
  panelClassName = "",
  dismissible = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  panelClassName?: string;
  dismissible?: boolean;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open && mounted);

  // portal mount gate (SSR-safe); flips once after mount
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, dismissible, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative z-10 outline-none animate-fade-up ${panelClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
