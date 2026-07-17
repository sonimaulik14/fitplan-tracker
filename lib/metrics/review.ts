import { prisma } from "../prisma";
import { est1RM } from "../progression";

// The weekly training review: last 7 days vs the 7 before, plus strength
// movement against all-time bests. Powers /review and the Monday push digest.

export type MuscleWeek = {
  muscle: string;
  sets: number; // working sets done this window
  prevSets: number;
};

export type LiftDelta = {
  name: string;
  muscle: string;
  bestE1rm: number; // kg, best this window
  priorBest: number; // kg, best of everything before this window (0 = new lift)
  deltaKg: number;
};

export type WeeklyReview = {
  start: Date; // inclusive start of the current window
  end: Date; // exclusive end (now)
  workouts: number;
  prevWorkouts: number;
  volumeKg: number;
  prevVolumeKg: number;
  setsByMuscle: MuscleWeek[];
  lifts: LiftDelta[]; // every lift trained this window, biggest gain first
  prCount: number; // lifts whose window best topped their prior all-time best
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getWeeklyReview(
  userId: string,
  now: Date = new Date()
): Promise<WeeklyReview> {
  const start = new Date(now.getTime() - WEEK_MS);
  const prevStart = new Date(now.getTime() - 2 * WEEK_MS);

  const [entries, swaps, workouts, prevWorkouts] = await Promise.all([
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
        setType: true,
        planExerciseId: true,
        planExercise: { select: { name: true, muscle: true, isCardio: true } },
        session: { select: { performedDate: true } },
      },
    }),
    prisma.exerciseSwap.findMany({
      where: { enrollment: { userId, status: "active" } },
      select: { planExerciseId: true, name: true },
    }),
    prisma.workoutSession.count({
      where: {
        enrollment: { userId },
        status: "completed",
        performedDate: { gte: start, lt: now },
      },
    }),
    prisma.workoutSession.count({
      where: {
        enrollment: { userId },
        status: "completed",
        performedDate: { gte: prevStart, lt: start },
      },
    }),
  ]);
  const swapName = new Map(swaps.map((s) => [s.planExerciseId, s.name]));

  let volumeKg = 0;
  let prevVolumeKg = 0;
  const muscle = new Map<string, { sets: number; prevSets: number }>();
  const lift = new Map<
    string,
    { muscle: string; best: number; priorBest: number }
  >();

  for (const e of entries) {
    const at = e.session.performedDate;
    const inCurr = at >= start && at < now;
    const inPrev = at >= prevStart && at < start;
    const w = e.weight!;
    const reps = e.reps!;

    if (!e.planExercise.isCardio) {
      if (inCurr) volumeKg += w * reps;
      else if (inPrev) prevVolumeKg += w * reps;

      if (e.setType === "work" && (inCurr || inPrev)) {
        const m = e.planExercise.muscle;
        const rec = muscle.get(m) ?? { sets: 0, prevSets: 0 };
        if (inCurr) rec.sets++;
        else rec.prevSets++;
        muscle.set(m, rec);
      }

      const name = swapName.get(e.planExerciseId) ?? e.planExercise.name;
      const orm = est1RM(w, reps);
      const rec = lift.get(name) ?? {
        muscle: e.planExercise.muscle,
        best: 0,
        priorBest: 0,
      };
      if (inCurr) rec.best = Math.max(rec.best, orm);
      else if (at < start) rec.priorBest = Math.max(rec.priorBest, orm);
      lift.set(name, rec);
    }
  }

  const lifts: LiftDelta[] = [...lift.entries()]
    .filter(([, r]) => r.best > 0) // trained this window
    .map(([name, r]) => ({
      name,
      muscle: r.muscle,
      bestE1rm: r.best,
      priorBest: r.priorBest,
      deltaKg: r.priorBest > 0 ? r.best - r.priorBest : 0,
    }))
    .sort((a, b) => b.deltaKg - a.deltaKg);

  return {
    start,
    end: now,
    workouts,
    prevWorkouts,
    volumeKg: Math.round(volumeKg),
    prevVolumeKg: Math.round(prevVolumeKg),
    setsByMuscle: [...muscle.entries()]
      .map(([m, r]) => ({ muscle: m, ...r }))
      .sort((a, b) => b.sets - a.sets),
    lifts,
    prCount: lifts.filter((l) => l.priorBest > 0 && l.deltaKg > 0.01).length,
  };
}
