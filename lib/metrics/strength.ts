import { prisma } from "../prisma";
import { ymd } from "../date";
import { est1RM } from "../progression";
import { getBodyweightSeries } from "./body";
import {
  classifyLift,
  strengthNext,
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

export type BestLift = { exerciseName: string; e1RMkg: number; date: Date };

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
  date: string | null; // ymd of the session that produced the best e1RM
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
  const [entries, swaps, bw] = await Promise.all([
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
  ]);

  const swapName = new Map(swaps.map((s) => [s.planExerciseId, s.name]));
  const rows: LiftRow[] = entries.map((e) => ({
    name: swapName.get(e.planExerciseId) ?? e.planExercise.name,
    isCardio: e.planExercise.isCardio,
    weight: e.weight!,
    reps: e.reps!,
    date: e.session.performedDate,
  }));
  const best = bestLiftsByCategory(rows);
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
      standard: b ? strengthNext(b.e1RMkg, latestBwKg, b.exerciseName) : null,
    };
  });

  return { latestBwKg, lifts };
}
