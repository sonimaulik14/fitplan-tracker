"use client";

import { useState } from "react";
import { Calculator, Plus, Minus } from "lucide-react";
import type { Unit } from "@/lib/ui";

const PLATES: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};
const BARS: Record<Unit, number[]> = {
  kg: [20, 15, 10, 0],
  lb: [45, 35, 0],
};
const STEP: Record<Unit, number> = { kg: 2.5, lb: 5 };

function platesPerSide(target: number, bar: number, unit: Unit) {
  let perSide = (target - bar) / 2;
  if (perSide <= 0) return [];
  const out: number[] = [];
  for (const p of PLATES[unit]) {
    while (perSide >= p - 1e-9) {
      out.push(p);
      perSide -= p;
    }
  }
  return out;
}

function roundToStep(n: number, step: number) {
  return Math.round(n / step) * step;
}

export default function WorkoutTools({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [bar, setBar] = useState(BARS[unit][0]);

  const t = Number(target) || 0;
  const plates = platesPerSide(t, bar, unit);
  const leftover =
    t > bar ? +(((t - bar) / 2) - plates.reduce((a, b) => a + b, 0)).toFixed(2) : 0;

  const ramp =
    t > 0
      ? [
          { pct: 0.4, reps: 8 },
          { pct: 0.55, reps: 6 },
          { pct: 0.7, reps: 4 },
          { pct: 0.85, reps: 2 },
        ].map((s) => ({
          weight: Math.max(bar, roundToStep(t * s.pct, STEP[unit])),
          reps: s.reps,
        }))
      : [];

  return (
    <div className="card p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between"
      >
        <span className="font-semibold text-sm flex items-center gap-2">
          <Calculator size={16} className="text-muted" aria-hidden />
          Plate &amp; warm-up calculator
        </span>
        <span className="grid place-items-center w-6 h-6 rounded-md text-muted">
          {open ? <Minus size={15} /> : <Plus size={15} />}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Target weight</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 100"
                  className="input py-2 pr-9 w-36"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                  {unit}
                </span>
              </div>
            </div>
            <div>
              <label className="label">Bar</label>
              <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5 text-xs font-semibold">
                {BARS[unit].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBar(b)}
                    className={`px-2.5 py-1.5 rounded-md transition-colors ${
                      bar === b
                        ? "bg-accent text-[#ffffff]"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {b === 0 ? "none" : b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plates per side */}
          {t > bar && (
            <div>
              <div className="text-xs text-muted mb-1.5">
                Load per side ({unit}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {plates.map((p, i) => (
                  <span
                    key={i}
                    className="inline-grid place-items-center min-w-9 h-9 px-2 rounded-lg bg-accent/15 border border-accent/30 text-sm font-bold"
                  >
                    {p}
                  </span>
                ))}
                {plates.length === 0 && (
                  <span className="text-sm text-muted">just the bar</span>
                )}
              </div>
              {leftover > 0 && (
                <div className="text-[11px] text-amber-300 mt-1.5">
                  ~{leftover} {unit}/side not loadable with standard plates
                </div>
              )}
            </div>
          )}

          {/* Warm-up ramp */}
          {ramp.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-1.5">
                Suggested warm-up ramp to {t} {unit}:
              </div>
              <div className="flex flex-wrap gap-2">
                {ramp.map((s, i) => (
                  <span
                    key={i}
                    className="text-sm rounded-lg bg-surface-2 border border-border px-2.5 py-1.5"
                  >
                    <span className="font-display font-bold">{s.weight}</span>
                    <span className="text-muted"> × {s.reps}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
