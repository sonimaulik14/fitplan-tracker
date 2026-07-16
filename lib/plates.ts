// Plate-loading math + warm-up ramp. Pure and unit-agnostic: every number is
// in the caller's display unit; pass the matching bar weight and plate set.

export const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const LB_PLATES = [45, 35, 25, 10, 5, 2.5];
export const KG_BARS = [20, 15, 10];
export const LB_BARS = [45, 35, 25];

export type PlateCount = { plate: number; count: number };

export type PlateLoad = {
  perSide: PlateCount[];
  achievedTotal: number; // bar + loadable plates (may be under the target)
  exact: boolean;
};

/**
 * Greedy per-side plate breakdown for a target total. When the remainder
 * isn't loadable with the given plates, rounds DOWN to the closest achievable
 * total (never suggests more weight than asked). Null when the target is
 * below the bar itself.
 */
export function platesPerSide(
  target: number,
  bar: number,
  plates: number[] = KG_PLATES
): PlateLoad | null {
  if (!Number.isFinite(target) || target < bar) return null;
  let side = (target - bar) / 2;
  const perSide: PlateCount[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    const count = Math.floor((side + 1e-9) / p);
    if (count > 0) {
      perSide.push({ plate: p, count });
      side -= count * p;
    }
  }
  const loaded = perSide.reduce((s, pc) => s + pc.plate * pc.count, 0);
  const achievedTotal = +(bar + loaded * 2).toFixed(2);
  return { perSide, achievedTotal, exact: Math.abs(achievedTotal - target) < 0.01 };
}

export function roundToStep(v: number, step: number): number {
  return +(Math.round(v / step) * step).toFixed(2);
}

export type RampStep = {
  label: string;
  weight: number; // display unit, rounded to the smallest plate step
  reps: number;
  pct: number; // of working weight (100 = the work set)
};

/**
 * Classic warm-up ramp toward a working weight: empty bar, then ~45/65/85%
 * with falling reps. Steps that land at (or below) the bar collapse into the
 * bar-only step; a ramp for a bar-weight work set is just the bar.
 */
export function warmupRamp(
  work: number,
  bar: number,
  plates: number[] = KG_PLATES
): RampStep[] {
  if (!Number.isFinite(work) || work <= 0) return [];
  const step = Math.min(...plates) * 2; // smallest per-side plate pair
  const stages = [
    { pct: 45, reps: 8 },
    { pct: 65, reps: 5 },
    { pct: 85, reps: 3 },
  ];
  const ramp: RampStep[] = [{ label: "Bar", weight: bar, reps: 10, pct: 0 }];
  for (const s of stages) {
    const w = Math.min(
      roundToStep((work * s.pct) / 100, step),
      roundToStep(work - step, step)
    );
    if (w <= bar) continue; // folded into the bar step
    if (ramp.some((r) => r.weight === w)) continue; // dedupe rounded collisions
    ramp.push({ label: `${s.pct}%`, weight: w, reps: s.reps, pct: s.pct });
  }
  ramp.push({ label: "Work", weight: work, reps: 0, pct: 100 });
  return ramp;
}
