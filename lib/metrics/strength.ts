import { prisma } from "../prisma";
import { ymd } from "../date";
import { est1RM } from "../progression";
import { getBodyweightSeries } from "./body";
import {
  classifyLift,
  strengthNext,
  strengthNextByKey,
  LIFT_CATEGORIES,
  type LiftKey,
  type StrengthRank,
} from "../ui";

// Strength profile: best est. 1RM per recognised barbell-lift category,
// ranked against bodyweight-ratio standards (Beginner → Elite).

export type LiftRow = {
  name: string; // effective (swap-aware) name — caller resolves swaps
  isCardio: boolean;
  weight: number; // kg
  reps: number;
  date: Date;
};

export type BestLift = {
  exerciseName: string;
  e1RMkg: number;
  date: Date;
  tested?: boolean; // came from a 1RM test day, not a working set
};

/**
 * A tested single IS the 1RM — Epley on reps=1 would over-credit ~3.3%.
 * Multi-rep tests back-calculate through the same formula as everything else.
 */
export function testMax(t: { weightKg: number; reps: number }): number {
  return t.reps === 1 ? t.weightKg : est1RM(t.weightKg, t.reps);
}

/** Merge test-day results into the set-derived bests (mutates nothing). */
export function mergeTests(
  best: Map<LiftKey, BestLift>,
  tests: { liftKey: string; weightKg: number; reps: number; date: Date }[]
): Map<LiftKey, BestLift> {
  const merged = new Map(best);
  for (const t of tests) {
    const key = t.liftKey as LiftKey;
    if (!LIFT_CATEGORIES.some((c) => c.key === key)) continue;
    const max = testMax(t);
    if (max <= 0) continue;
    const cur = merged.get(key);
    if (!cur || max > cur.e1RMkg)
      merged.set(key, {
        exerciseName: "1RM test",
        e1RMkg: max,
        date: t.date,
        tested: true,
      });
  }
  return merged;
}

/** Pure: best est. 1RM per standards category. Skips cardio and accessories. */
export function bestLiftsByCategory(rows: LiftRow[]): Map<LiftKey, BestLift> {
  const best = new Map<LiftKey, BestLift>();
  for (const r of rows) {
    if (r.isCardio || r.weight <= 0 || r.reps <= 0) continue;
    const key = classifyLift(r.name);
    if (!key) continue;
    const e = est1RM(r.weight, r.reps);
    const cur = best.get(key);
    if (!cur || e > cur.e1RMkg)
      best.set(key, { exerciseName: r.name, e1RMkg: e, date: r.date });
  }
  return best;
}

export type StrengthLift = {
  key: LiftKey;
  label: string;
  muscle: string;
  thresholds: number[];
  exerciseName: string | null; // null = category never performed
  e1RMkg: number | null;
  date: string | null; // ymd of the session/test that produced the best e1RM
  tested: boolean; // best came from a 1RM test day
  standard: StrengthRank | null; // null when unperformed OR no bodyweight
};

export type StrengthProfile = {
  latestBwKg: number | null;
  lifts: StrengthLift[]; // always all categories, table order
};

/**
 * All-time (every enrollment) best e1RM per big lift, swap-aware, ranked
 * against the user's latest bodyweight. One entries scan — same shape as
 * getPlateaus.
 */
export async function getStrengthProfile(userId: string): Promise<StrengthProfile> {
  const [entries, swaps, bw, tests] = await Promise.all([
    prisma.setEntry.findMany({
      where: {
        done: true,
        weight: { not: null },
        reps: { not: null },
        session: { enrollment: { userId } },
      },
      select: {
        weight: true,
        reps: true,
        planExerciseId: true,
        planExercise: { select: { name: true, isCardio: true } },
        session: { select: { performedDate: true } },
      },
    }),
    prisma.exerciseSwap.findMany({
      where: { enrollment: { userId, status: "active" } },
      select: { planExerciseId: true, name: true },
    }),
    getBodyweightSeries(userId),
    prisma.liftTest.findMany({
      where: { userId },
      select: { liftKey: true, weightKg: true, reps: true, date: true },
    }),
  ]);

  const swapName = new Map(swaps.map((s) => [s.planExerciseId, s.name]));
  const rows: LiftRow[] = entries.map((e) => ({
    name: swapName.get(e.planExerciseId) ?? e.planExercise.name,
    isCardio: e.planExercise.isCardio,
    weight: e.weight!,
    reps: e.reps!,
    date: e.session.performedDate,
  }));
  const best = mergeTests(bestLiftsByCategory(rows), tests);
  const latestBwKg = bw.length ? bw[bw.length - 1].weight : null;

  const lifts: StrengthLift[] = LIFT_CATEGORIES.map((c) => {
    const b = best.get(c.key);
    return {
      key: c.key,
      label: c.label,
      muscle: c.muscle,
      thresholds: c.thresholds,
      exerciseName: b?.exerciseName ?? null,
      e1RMkg: b?.e1RMkg ?? null,
      date: b ? ymd(b.date) : null,
      tested: b?.tested ?? false,
      standard: b
        ? b.tested
          ? strengthNextByKey(b.e1RMkg, latestBwKg, c.key)
          : strengthNext(b.e1RMkg, latestBwKg, b.exerciseName)
        : null,
    };
  });

  return { latestBwKg, lifts };
}
