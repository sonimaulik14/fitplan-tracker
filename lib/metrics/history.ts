import { prisma } from "../prisma";
import { ymd } from "../date";
import { est1RM } from "../progression";
import { getBodyweightSeries } from "./body";

// est1RM moved to lib/progression.ts (pure, client-safe); re-exported so
// existing `@/lib/metrics` importers keep working unchanged.
export { est1RM };

/** Logged sessions, newest first, with per-session totals. Bounded by `take`
 *  (covers multi-year history while capping memory) and selects only the
 *  columns the summary needs. */
export async function getWorkoutHistory(userId: string, take = 200) {
  const sessions = await prisma.workoutSession.findMany({
    where: { enrollment: { userId } },
    select: {
      id: true,
      workoutDayId: true,
      performedDate: true,
      status: true,
      mood: true,
      workoutDay: {
        select: {
          focus: true,
          dayNumber: true,
          week: { select: { number: true } },
        },
      },
      setEntries: { select: { done: true, weight: true, reps: true } },
    },
    orderBy: { performedDate: "desc" },
    take,
  });
  return sessions.map((s) => {
    const done = s.setEntries.filter((e) => e.done);
    const volume = done.reduce(
      (v, e) => v + (e.weight && e.reps ? e.weight * e.reps : 0),
      0
    );
    return {
      id: s.id,
      dayId: s.workoutDayId,
      date: s.performedDate,
      focus: s.workoutDay.focus,
      week: s.workoutDay.week.number,
      dayGlobal: (s.workoutDay.week.number - 1) * 7 + s.workoutDay.dayNumber,
      status: s.status,
      doneSets: done.length,
      volume,
      mood: s.mood,
    };
  });
}

/**
 * Most recent previously-logged value for each exercise (by name), so the
 * logging screen can show "last time" and offer autofill. Excludes the day
 * currently being logged.
 */
export async function getLastTimeByExercise(
  userId: string,
  planId: string,
  excludeWorkoutDayId: string
) {
  const [entries, swaps] = await Promise.all([
    prisma.setEntry.findMany({
      where: {
        done: true,
        weight: { not: null },
        reps: { not: null },
        session: {
          // Deliberately spans ALL cycles of this plan — Day 1 of cycle 2
          // should show cycle-1 numbers as "last time" + overload baseline.
          enrollment: { userId, planId },
          workoutDayId: { not: excludeWorkoutDayId },
        },
      },
      include: { planExercise: true, session: true },
      orderBy: [{ session: { performedDate: "desc" } }, { setNumber: "desc" }],
    }),
    // Swaps come from the ACTIVE enrollment only, so history is keyed by
    // today's effective movement names (not a stale cycle's).
    prisma.exerciseSwap.findMany({
      where: { enrollment: { userId, planId, status: "active" } },
    }),
  ]);

  const swapName = new Map(swaps.map((s) => [s.planExerciseId, s.name]));

  const map: Record<
    string,
    {
      weight: number;
      reps: number;
      rpe: number | null;
      date: Date;
      bestE1rm: number; // all-time best est. 1RM (kg) — powers live PR detection
    }
  > = {};
  for (const e of entries) {
    // key by the effective (possibly swapped) movement name
    const name = swapName.get(e.planExerciseId) ?? e.planExercise.name;
    if (!map[name]) {
      map[name] = {
        weight: e.weight!,
        reps: e.reps!,
        rpe: e.rpe,
        date: e.session.performedDate,
        bestE1rm: 0,
      };
    }
    map[name].bestE1rm = Math.max(map[name].bestE1rm, est1RM(e.weight!, e.reps!));
  }
  return map;
}

export async function getExerciseHistory(userId: string, name: string) {
  // Fetch swaps once (instead of re-including enrollment.swaps on every set row)
  // and select only the columns this function uses.
  const [entries, swaps] = await Promise.all([
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
        planExercise: { select: { name: true, muscle: true } },
        session: { select: { performedDate: true } },
      },
      orderBy: { session: { performedDate: "asc" } },
    }),
    // Active enrollment's swaps only — with copied swap rows on every cycle,
    // an unscoped query could key the same exercise two different ways.
    prisma.exerciseSwap.findMany({
      where: { enrollment: { userId, status: "active" } },
      select: { planExerciseId: true, name: true },
    }),
  ]);
  const swapName = new Map(swaps.map((s) => [s.planExerciseId, s.name]));

  // keep only entries whose effective (or original) name matches
  const matched = entries.filter((e) => {
    const eff = swapName.get(e.planExerciseId) ?? e.planExercise.name;
    return eff === name || e.planExercise.name === name;
  });

  // group by date
  const byDate = new Map<
    string,
    { topWeight: number; best1RM: number; volume: number; reps: number }
  >();
  let muscle = "Other";
  for (const e of matched) {
    muscle = e.planExercise.muscle;
    const key = ymd(e.session.performedDate);
    const w = e.weight!;
    const reps = e.reps!;
    const cur =
      byDate.get(key) ?? { topWeight: 0, best1RM: 0, volume: 0, reps: 0 };
    cur.volume += w * reps;
    if (w > cur.topWeight) {
      cur.topWeight = w;
      cur.reps = reps;
    }
    cur.best1RM = Math.max(cur.best1RM, est1RM(w, reps));
    byDate.set(key, cur);
  }

  const points = [...byDate.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const best1RM = points.reduce((m, p) => Math.max(m, p.best1RM), 0);

  // plateau: best1RM of last 3 sessions not exceeding the prior best
  let plateau = false;
  if (points.length >= 4) {
    const last3 = points.slice(-3);
    const priorBest = Math.max(...points.slice(0, -3).map((p) => p.best1RM));
    plateau = last3.every((p) => p.best1RM <= priorBest + 0.01);
  }

  const bw = await getBodyweightSeries(userId);
  const latestBwKg = bw.length ? bw[bw.length - 1].weight : null;

  return { name, muscle, points, best1RM, plateau, latestBwKg };
}
