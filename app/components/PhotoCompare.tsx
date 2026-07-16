"use client";

import { useRef, useState } from "react";
import { weightNum, type Unit } from "@/lib/ui";

type Photo = { id: string; dataUrl: string; date: string }; // date = ISO string
type BW = { date: string; weight: number }; // weight in kg, date = YYYY-MM-DD

function ymd(iso: string) {
  return iso.slice(0, 10);
}

// Nearest bodyweight (kg) to a given day, within `windowDays`.
function nearestWeight(bw: BW[], dayIso: string, windowDays = 21): number | null {
  const target = new Date(ymd(dayIso)).getTime();
  let best: { diff: number; weight: number } | null = null;
  for (const b of bw) {
    const diff = Math.abs(new Date(b.date).getTime() - target);
    if (!best || diff < best.diff) best = { diff, weight: b.weight };
  }
  if (!best) return null;
  return best.diff <= windowDays * 86400000 ? best.weight : null;
}

function fmtGap(aIso: string, bIso: string) {
  const days = Math.round(
    Math.abs(new Date(ymd(bIso)).getTime() - new Date(ymd(aIso)).getTime()) /
      86400000
  );
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} apart`;
  const weeks = Math.round(days / 7);
  return `${weeks} weeks apart`;
}

export default function PhotoCompare({
  photos,
  bw,
  unit,
}: {
  photos: Photo[];
  bw: BW[];
  unit: Unit;
}) {
  const [beforeId, setBeforeId] = useState(photos[0].id);
  const [afterId, setAfterId] = useState(photos[photos.length - 1].id);
  const [mode, setMode] = useState<"slider" | "side">("slider");
  const [pos, setPos] = useState(50); // slider divider %, 0..100
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const before = photos.find((p) => p.id === beforeId) ?? photos[0];
  const after =
    photos.find((p) => p.id === afterId) ?? photos[photos.length - 1];

  const move = (clientX: number) => {
    const box = boxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  };

  // Weight delta between the two selected dates (if we have weigh-ins near both).
  const wBefore = nearestWeight(bw, before.date);
  const wAfter = nearestWeight(bw, after.date);
  let weightDelta: number | null = null;
  if (wBefore != null && wAfter != null)
    weightDelta = weightNum(wAfter, unit) - weightNum(wBefore, unit);

  return (
    <div className="mb-5">
      {/* selectors + mode toggle */}
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <label className="flex-1 min-w-[120px]">
          <span className="label">Before</span>
          <select
            className="input !py-2"
            value={beforeId}
            onChange={(e) => setBeforeId(e.target.value)}
          >
            {photos.map((p) => (
              <option key={p.id} value={p.id}>
                {new Date(p.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 min-w-[120px]">
          <span className="label">After</span>
          <select
            className="input !py-2"
            value={afterId}
            onChange={(e) => setAfterId(e.target.value)}
          >
            {photos.map((p) => (
              <option key={p.id} value={p.id}>
                {new Date(p.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {(["slider", "side"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                mode === m
                  ? "bg-accent text-accent-ink"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {m === "slider" ? "Slider" : "Side by side"}
            </button>
          ))}
        </div>
      </div>

      {mode === "slider" ? (
        <div
          ref={boxRef}
          className="relative aspect-[3/4] sm:aspect-[4/3] max-h-[70vh] mx-auto rounded-xl overflow-hidden border border-border select-none touch-none cursor-ew-resize"
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            move(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && move(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
        >
          {/* after = base layer */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={after.dataUrl}
            alt="after"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* before = clipped from the left to the divider */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before.dataUrl}
            alt="before"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          />
          {/* divider + handle */}
          <div
            className="absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
            style={{ left: `${pos}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 text-[#11131b] grid place-items-center text-sm font-bold shadow-lg">
              ⇄
            </div>
          </div>
          <span className="absolute top-2 left-2 chip !bg-black/60 !border-white/20 text-white text-[11px]">
            Before · {new Date(before.date).toLocaleDateString()}
          </span>
          <span className="absolute top-2 right-2 chip !bg-black/60 !border-white/20 text-white text-[11px]">
            After · {new Date(after.date).toLocaleDateString()}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[
            { p: before, label: "Before" },
            { p: after, label: "After" },
          ].map(({ p, label }) => (
            <div
              key={label}
              className="relative rounded-xl overflow-hidden aspect-[3/4] border border-border img-overlay"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.dataUrl}
                alt={label}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-3 z-10 text-white">
                <div className="font-semibold text-sm drop-shadow">{label}</div>
                <div className="text-[11px] text-white/80">
                  {new Date(p.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* stats strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 mt-3 text-sm">
        <span className="text-muted">{fmtGap(before.date, after.date)}</span>
        {weightDelta != null && Math.abs(weightDelta) >= 0.1 && (
          <span
            className="stat-num font-semibold"
            style={{
              color: weightDelta < 0 ? "var(--success)" : "var(--accent-hi)",
            }}
          >
            {weightDelta > 0 ? "+" : ""}
            {weightDelta.toFixed(1)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}
