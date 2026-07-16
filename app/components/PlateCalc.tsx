"use client";

import { useMemo, useState } from "react";
import { Disc3 } from "lucide-react";
import Sheet from "./Sheet";
import type { Unit } from "@/lib/ui";
import {
  platesPerSide,
  warmupRamp,
  KG_PLATES,
  LB_PLATES,
  KG_BARS,
  LB_BARS,
} from "@/lib/plates";

// "What do I put on the bar?" — per-side plate breakdown + a warm-up ramp
// for a working weight. All math happens in the user's display unit.

export default function PlateCalc({
  unit,
  initialWeight,
  exerciseName,
}: {
  unit: Unit;
  initialWeight: number | null;
  exerciseName: string;
}) {
  const [open, setOpen] = useState(false);
  const plates = unit === "lb" ? LB_PLATES : KG_PLATES;
  const bars = unit === "lb" ? LB_BARS : KG_BARS;
  const [bar, setBar] = useState(bars[0]);
  const [weight, setWeight] = useState<number | null>(initialWeight);

  const load = useMemo(
    () => (weight != null ? platesPerSide(weight, bar, plates) : null),
    [weight, bar, plates]
  );
  const ramp = useMemo(
    () => (weight != null ? warmupRamp(weight, bar, plates) : []),
    [weight, bar, plates]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setWeight(initialWeight);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted hover:text-foreground hover:border-border-strong transition-colors"
        title="Plate calculator & warm-up ramp"
      >
        <Disc3 size={13} aria-hidden /> Plates
      </button>

      {open && (
        <Sheet
          open
          onClose={() => setOpen(false)}
          ariaLabel={`Plate calculator for ${exerciseName}`}
          panelClassName="w-full sm:max-w-sm card rounded-t-2xl sm:rounded-xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <h3 className="font-display font-semibold text-xl">{exerciseName}</h3>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className="label" htmlFor="pc-weight">
                Working weight ({unit})
              </label>
              <input
                id="pc-weight"
                type="number"
                inputMode="decimal"
                className="input stat-num"
                value={weight ?? ""}
                onChange={(e) =>
                  setWeight(e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div>
              <span className="label">Bar</span>
              <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5 text-xs font-semibold">
                {bars.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBar(b)}
                    className={`flex-1 px-2 py-2 rounded-md stat-num transition-colors ${
                      bar === b
                        ? "bg-accent text-accent-ink"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* per-side plates */}
          <div className="mt-4">
            <span className="eyebrow">Per side</span>
            {load == null ? (
              <p className="text-sm text-muted mt-1.5">
                Enter a weight at or above the bar ({bar} {unit}).
              </p>
            ) : load.perSide.length === 0 ? (
              <p className="text-sm mt-1.5">Empty bar — no plates needed.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {load.perSide.flatMap(({ plate, count }) =>
                  Array.from({ length: count }, (_, i) => (
                    <span
                      key={`${plate}-${i}`}
                      className="grid place-items-center rounded-full border-2 border-accent/50 bg-accent/10 stat-num text-xs"
                      style={{
                        width: `${Math.max(34, Math.min(56, plate * 1.6))}px`,
                        height: `${Math.max(34, Math.min(56, plate * 1.6))}px`,
                      }}
                    >
                      {plate}
                    </span>
                  ))
                )}
              </div>
            )}
            {load && !load.exact && (
              <p className="text-xs text-warn mt-2">
                {weight} {unit} isn&apos;t loadable — closest is{" "}
                <span className="stat-num">{load.achievedTotal} {unit}</span>.
              </p>
            )}
          </div>

          {/* warm-up ramp */}
          {ramp.length > 1 && (
            <div className="mt-5">
              <span className="eyebrow">Warm-up ramp</span>
              <div className="mt-2 divide-y divide-border rounded-lg border border-border overflow-hidden">
                {ramp.map((r) => (
                  <div
                    key={r.label}
                    className={`flex items-center justify-between px-3 py-2 text-sm ${
                      r.label === "Work" ? "bg-accent/10 font-semibold" : ""
                    }`}
                  >
                    <span className={r.label === "Work" ? "text-accent" : "text-muted"}>
                      {r.label}
                    </span>
                    <span className="stat-num">
                      {r.weight} {unit}
                      {r.reps > 0 && (
                        <span className="text-muted"> × {r.reps}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
