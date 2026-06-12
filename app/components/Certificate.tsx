"use client";

import { useRef, useState } from "react";

export default function Certificate({
  name,
  planName,
  totalWeeks,
  workouts,
  sets,
  dateLabel,
}: {
  name: string;
  planName: string;
  totalWeeks: number;
  workouts: number;
  sets: number;
  dateLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const url = await (await import("html-to-image")).toPng(ref.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${planName.replace(/\s+/g, "-").toLowerCase()}-certificate.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        ref={ref}
        className="relative overflow-hidden rounded-2xl border-2 border-accent/40 p-8 text-center"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, var(--accent) 14%, var(--surface)) 0%, var(--surface) 60%)",
        }}
      >
        <div className="text-4xl">🏆</div>
        <div className="text-xs uppercase tracking-[0.3em] text-accent font-semibold mt-3">
          Certificate of Completion
        </div>
        <div className="text-2xl font-display font-bold mt-4">{name}</div>
        <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
          has completed the full {totalWeeks}-week
          <br />
          <span className="font-semibold text-foreground">{planName}</span>
        </p>
        <div className="flex justify-center gap-8 mt-6">
          <div>
            <div className="font-display font-bold text-xl">{workouts}</div>
            <div className="text-[11px] text-muted">workouts</div>
          </div>
          <div>
            <div className="font-display font-bold text-xl">
              {sets.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted">sets logged</div>
          </div>
          <div>
            <div className="font-display font-bold text-xl">{totalWeeks}</div>
            <div className="text-[11px] text-muted">weeks</div>
          </div>
        </div>
        <div className="text-xs text-muted mt-6">{dateLabel}</div>
      </div>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="btn-primary w-full mt-4 disabled:opacity-60"
      >
        {busy ? "Rendering…" : "⬇ Download certificate"}
      </button>
    </div>
  );
}
