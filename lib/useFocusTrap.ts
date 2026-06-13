"use client";

import { useEffect } from "react";

/**
 * Accessibility helper for modal dialogs: when `open`, moves focus into the
 * dialog, traps Tab/Shift+Tab inside it, and restores focus to the previously
 * focused element on close. Attach the ref to the dialog container (give it
 * `tabIndex={-1}` so it can receive focus as a fallback).
 */
export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean
) {
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const prevFocus = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      ).filter((n) => n.offsetParent !== null);

    (focusable()[0] ?? el).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const f = focusable();
      if (f.length === 0) {
        e.preventDefault();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [open, ref]);
}
