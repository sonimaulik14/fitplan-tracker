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

export type TrendPoint = { date: Date; e1RMkg: number };

/** Per-category best est. 1RM per calendar day, sorted ascending. */
export function dailyBestSeries(rows: LiftRow[]): Map<LiftKey, TrendPoint[]> {
  const byKeyDay = new Map<LiftKey, Map<string, TrendPoint>>();
  for (const r of rows) {
    if (r.isCardio || r.weight <= 0 || r.reps <= 0) continue;
    const key = classifyLift(r.name);
    if (!key) continue;
    const e = est1RM(r.weight, r.reps);
    const day = ymd(r.date);
    let m = byKeyDay.get(key);
    if (!m) byKeyDay.set(key, (m = new Map()));
    const cur = m.get(day);
    if (!cur || e > cur.e1RMkg) m.set(day, { date: r.date, e1RMkg: e });
  }
  const out = new Map<LiftKey, TrendPoint[]>();
  for (const [key, m] of byKeyDay)
    out.set(
      key,
      [...m.values()].sort((a, b) => +a.date - +b.date)
    );
  return out;
}

// Projection guards: enough history to mean something, a genuinely rising
// trend, and a crossing close enough to be motivating rather than fictional.
const MIN_POINTS = 3;
const MIN_SPAN_DAYS = 14;
const MIN_SLOPE_KG_PER_DAY = 0.01; // ≈ 3.7 kg/year
const MAX_HORIZON_DAYS = 365;

/**
 * Least-squares trend over a lift's e1RM history; the date the trend line
 * crosses `targetKg`, or null when the data doesn't support a projection.
 */
export function projectCrossing(
  points: TrendPoint[],
  targetKg: number,
  now: Date
): Date | null {
  if (points.length < MIN_POINTS) return null;
  const t0 = +points[0].date;
  const span = (+points[points.length - 1].date - t0) / 86_400_000;
  if (span < MIN_SPAN_DAYS) return null;

  const xs = points.map((p) => (+p.date - t0) / 86_400_000);
  const ys = points.map((p) => p.e1RMkg);
  const n = points.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den; // kg per day
  if (slope < MIN_SLOPE_KG_PER_DAY) return null;
  const intercept = my - slope * mx;

  const tNow = (+now - t0) / 86_400_000;
  const valueNow = intercept + slope * tNow;
  const daysTo = (targetKg - valueNow) / slope;
  if (daysTo <= 0 || daysTo > MAX_HORIZON_DAYS) return null;
  const d = new Date(now);
  d.setDate(d.getDate() + Math.ceil(daysTo));
  return d;
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
  /** "On pace for {level} by {date}" — null when the trend doesn't support it. */
  projection: { level: string; date: string } | null;
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

  // Trend series per category: session bests plus tested maxes as points.
  const series = dailyBestSeries(rows);
  for (const t of tests) {
    const key = t.liftKey as LiftKey;
    if (!LIFT_CATEGORIES.some((c) => c.key === key)) continue;
    const pts = series.get(key) ?? [];
    pts.push({ date: t.date, e1RMkg: testMax(t) });
    pts.sort((a, b) => +a.date - +b.date);
    series.set(key, pts);
  }
  const now = new Date();

  const lifts: StrengthLift[] = LIFT_CATEGORIES.map((c) => {
    const b = best.get(c.key);
    const standard = b
      ? b.tested
        ? strengthNextByKey(b.e1RMkg, latestBwKg, c.key)
        : strengthNext(b.e1RMkg, latestBwKg, b.exerciseName)
      : null;
    const crossing = standard?.next
      ? projectCrossing(series.get(c.key) ?? [], standard.next.targetKg, now)
      : null;
    return {
      key: c.key,
      label: c.label,
      muscle: c.muscle,
      thresholds: c.thresholds,
      exerciseName: b?.exerciseName ?? null,
      e1RMkg: b?.e1RMkg ?? null,
      date: b ? ymd(b.date) : null,
      tested: b?.tested ?? false,
      standard,
      projection:
        crossing && standard?.next
          ? { level: standard.next.level, date: ymd(crossing) }
          : null,
    };
  });

  return { latestBwKg, lifts };
}
