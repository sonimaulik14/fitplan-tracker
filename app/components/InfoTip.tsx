"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const W = 248;
    const x = Math.min(Math.max(8, r.left), window.innerWidth - W - 8);
    setPos({ x, y: r.bottom + 6 });
    setOpen(true);
  };
  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    const onScroll = () => hide();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          open ? hide() : show();
        }}
        onMouseEnter={show}
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
        pos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[55]"
              onClick={hide}
              onMouseDown={hide}
              aria-hidden
            />
            <div
              role="tooltip"
              onMouseLeave={hide}
              style={{ position: "fixed", left: pos.x, top: pos.y, width: 240 }}
              className="z-[56] card p-3 shadow-2xl animate-scale-in text-left normal-case tracking-normal"
            >
              <div className="font-semibold text-sm text-foreground">{title}</div>
              <div className="text-xs text-muted mt-1 leading-relaxed font-normal">
                {desc}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
