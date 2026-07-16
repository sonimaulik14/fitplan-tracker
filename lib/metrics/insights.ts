import { prisma } from "../prisma";
import { ymd } from "../date";
import { est1RM } from "./history";
import { getActiveEnrollment } from "./enrollment";

// Proactive coaching signals: stalled lifts (plateau + deload suggestion)
// and cycle-over-cycle strength deltas. Both power dashboard insight cards.

export type Plateau = {
  name: string;
  muscle: string;
  repTarget: string;
  bestKg: number; // best est. 1RM reached before stalling
  recentTopKg: number; // heaviest top-set weight in the most recent session
  recentReps: number;
  sessionsStalled: number;
  deloadKg: number; // suggested deload top weight (~90% of recent top)
};

/**
 * All weighted lifts whose estimated 1RM has stalled — the last 3+ sessions
 * never exceeded the prior best. One query across every exercise, so the
 * dashboard can proactively coach instead of waiting for the user to dig.
 */
export async function getPlateaus(userId: string): Promise<Plateau[]> {
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
        planExercise: {
          select: { name: true, muscle: true, repTarget: true, isCardio: true },
        },
        session: { select: { performedDate: true } },
      },
      orderBy: { session: { performedDate: "asc" } },
    }),
    // Active enrollment's swaps so lifts are keyed by today's effective names.
    prisma.exerciseSwap.findMany({
      where: { enrollment: { userId, status: "active" } },
      select: { planExerciseId: true, name: true },
    }),
  ]);
  const swapName = new Map(swaps.map((s) => [s.planExerciseId, s.name]));

  type Pt = { date: string; topWeight: number; reps: number; best1RM: number };
  const byEx = new Map<
    string,
    { muscle: string; repTarget: string; byDate: Map<string, Pt> }
  >();

  for (const e of entries) {
    if (e.planExercise.isCardio) continue;
    const name = swapName.get(e.planExerciseId) ?? e.planExercise.name;
    let rec = byEx.get(name);
    if (!rec) {
      rec = {
        muscle: e.planExercise.muscle,
        repTarget: e.planExercise.repTarget,
        byDate: new Map(),
      };
      byEx.set(name, rec);
    }
    const key = ymd(e.session.performedDate);
    const w = e.weight!;
    const reps = e.reps!;
    const cur =
      rec.byDate.get(key) ?? { date: key, topWeight: 0, reps: 0, best1RM: 0 };
    if (w > cur.topWeight) {
      cur.topWeight = w;
      cur.reps = reps;
    }
    cur.best1RM = Math.max(cur.best1RM, est1RM(w, reps));
    rec.byDate.set(key, cur);
  }

  const plateaus: Plateau[] = [];
  for (const [name, rec] of byEx) {
    const points = [...rec.byDate.values()].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    if (points.length < 4) continue;
    const priorBest = Math.max(...points.slice(0, -3).map((p) => p.best1RM));
    const stalledTail = points.slice(-3).every((p) => p.best1RM <= priorBest + 0.01);
    if (!stalledTail) continue;

    // how many of the most recent sessions are at/under the prior best
    let sessionsStalled = 0;
    for (let i = points.length - 1; i >= 0; i--) {
      if (points[i].best1RM <= priorBest + 0.01) sessionsStalled++;
      else break;
    }
    const recent = points[points.length - 1];
    plateaus.push({
      name,
      muscle: rec.muscle,
      repTarget: rec.repTarget,
      bestKg: priorBest,
      recentTopKg: recent.topWeight,
      recentReps: recent.reps,
      sessionsStalled,
      // Classic deload: drop ~10%, rebuild with clean reps over 1-2 sessions.
      deloadKg: Math.max(0, Math.round((recent.topWeight * 0.9) / 2.5) * 2.5),
    });
  }

  return plateaus.sort((a, b) => b.sessionsStalled - a.sessionsStalled);
}

export type CycleLiftDelta = {
  name: string;
  muscle: string;
  prevBest1RM: number; // kg
  currBest1RM: number; // kg
  deltaKg: number;
  deltaPct: number;
};

export type CycleComparison = {
  cycle: number;
  prevCycle: number;
  lifts: CycleLiftDelta[]; // improved first, then flat/regressed
  improvedCount: number;
  prevVolumeKg: number;
  currVolumeKg: number;
  prevWorkouts: number;
  currWorkouts: number;
};

/**
 * "vs last cycle" — compares the active enrollment against the previous run
 * of the same plan. Null when there's no earlier cycle to compare with; only
 * lifts logged in BOTH cycles are compared.
 */
export async function getCycleComparison(
  userId: string
): Promise<CycleComparison | null> {
  const active = await getActiveEnrollment(userId);
  if (!active || active.cycle < 2) return null;
  const prev = await prisma.enrollment.findFirst({
    where: { userId, planId: active.planId, cycle: active.cycle - 1 },
  });
  if (!prev) return null;

  const [entries, swaps, prevWorkouts, currWorkouts] = await Promise.all([
    prisma.setEntry.findMany({
      where: {
        done: true,
        weight: { not: null },
        reps: { not: null },
        session: { enrollmentId: { in: [active.id, prev.id] } },
      },
      select: {
        weight: true,
        reps: true,
        planExerciseId: true,
        planExercise: { select: { name: true, muscle: true, isCardio: true } },
        session: { select: { enrollmentId: true } },
      },
    }),
    prisma.exerciseSwap.findMany({
      where: { enrollmentId: active.id },
      select: { planExerciseId: true, name: true },
    }),
    prisma.workoutSession.count({
      where: { enrollmentId: prev.id, status: "completed" },
    }),
    prisma.workoutSession.count({
      where: { enrollmentId: active.id, status: "completed" },
    }),
  ]);
  const swapName = new Map(swaps.map((s) => [s.planExerciseId, s.name]));

  type Best = { prev: number; curr: number; muscle: string };
  const byName = new Map<string, Best>();
  let prevVolumeKg = 0;
  let currVolumeKg = 0;

  for (const e of entries) {
    const isPrev = e.session.enrollmentId === prev.id;
    if (isPrev) prevVolumeKg += e.weight! * e.reps!;
    else currVolumeKg += e.weight! * e.reps!;
    if (e.planExercise.isCardio) continue;
    const name = swapName.get(e.planExerciseId) ?? e.planExercise.name;
    const rec = byName.get(name) ?? {
      prev: 0,
      curr: 0,
      muscle: e.planExercise.muscle,
    };
    const orm = est1RM(e.weight!, e.reps!);
    if (isPrev) rec.prev = Math.max(rec.prev, orm);
    else rec.curr = Math.max(rec.curr, orm);
    byName.set(name, rec);
  }

  const lifts: CycleLiftDelta[] = [...byName.entries()]
    .filter(([, b]) => b.prev > 0 && b.curr > 0)
    .map(([name, b]) => ({
      name,
      muscle: b.muscle,
      prevBest1RM: b.prev,
      currBest1RM: b.curr,
      deltaKg: b.curr - b.prev,
      deltaPct: Math.round(((b.curr - b.prev) / b.prev) * 100),
    }))
    .sort((a, b) => b.deltaKg - a.deltaKg);

  return {
    cycle: active.cycle,
    prevCycle: prev.cycle,
    lifts,
    improvedCount: lifts.filter((l) => l.deltaKg > 0.01).length,
    prevVolumeKg: Math.round(prevVolumeKg),
    currVolumeKg: Math.round(currVolumeKg),
    prevWorkouts,
    currWorkouts,
  };
}
