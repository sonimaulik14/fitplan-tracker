import { prisma } from "../prisma";
import { ymd, streakLength, startOfDay, addDays, daysBetween } from "../date";
import { repTargetMin } from "../reps";
import { getActivePlan } from "./plan";

export type DayProgress = {
  dayId: string;
  weekNumber: number;
  label: string;
  focus: string;
  status: "not_started" | "in_progress" | "completed";
  prescribedSets: number;
  doneSets: number;
  exerciseCount: number;
  estMinutes: number;
  performedDate: Date | null;
};

export async function getProgress(userId: string) {
  const plan = await getActivePlan(userId);
  if (!plan) return null;

  // Active enrollment only (highest cycle) — progress is per-cycle; finished
  // cycles keep their history on their own archived rows.
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, planId: plan.id, status: "active" },
    orderBy: [{ cycle: "desc" }, { startDate: "desc" }],
    include: {
      sessions: {
        include: { setEntries: true },
      },
    },
  });

  const sessionByDay = new Map(
    (enrollment?.sessions ?? []).map((s) => [s.workoutDayId, s])
  );

  // Prescribed sets = warmup + working for every exercise (cardio counts as 1).
  const prescribedSetsForDay = (exercises: { warmupSets: number; workingSets: number }[]) =>
    exercises.reduce((sum, ex) => sum + ex.warmupSets + ex.workingSets, 0);

  const days: DayProgress[] = [];
  let prescribedSetsTotal = 0;
  let doneSetsTotal = 0;
  let prescribedWorkouts = 0;
  let completedWorkouts = 0;

  // Volume (weight x reps) and completed sets per muscle group.
  const volumeByMuscle: Record<string, number> = {};
  const setsByMuscle: Record<string, { done: number; prescribed: number }> = {};

  // Lookups for attribution.
  const exMuscle = new Map<string, string>();
  const exName = new Map<string, string>();
  const exRepMin = new Map<string, number | null>();
  const exIsCardio = new Map<string, boolean>();

  // Rep-quality: working sets where logged reps hit the target's lower bound.
  let workingSetsDone = 0;
  let workingSetsOnTarget = 0;

  // Per-week aggregation for trend charts.
  type WeekAgg = {
    weekNumber: number;
    style: string | null;
    prescribedWorkouts: number;
    completedWorkouts: number;
    prescribedSets: number;
    doneSets: number;
    volume: number;
    trainingDays: number;
    trainingDone: number;
  };
  const weekAgg = new Map<number, WeekAgg>();

  // Personal records by exercise name.
  type PR = {
    name: string;
    muscle: string;
    maxWeight: number;
    repsAtMax: number;
    bestVolume: number;
    date: Date | null;
  };
  const prByName = new Map<string, PR>();

  for (const week of plan.weeks) {
    const wa: WeekAgg = weekAgg.get(week.number) ?? {
      weekNumber: week.number,
      style: week.style,
      prescribedWorkouts: 0,
      completedWorkouts: 0,
      prescribedSets: 0,
      doneSets: 0,
      volume: 0,
      trainingDays: 0,
      trainingDone: 0,
    };
    weekAgg.set(week.number, wa);

    for (const day of week.days) {
      prescribedWorkouts += 1;
      wa.prescribedWorkouts += 1;
      const prescribed = prescribedSetsForDay(day.exercises);
      prescribedSetsTotal += prescribed;
      wa.prescribedSets += prescribed;

      for (const ex of day.exercises) {
        exMuscle.set(ex.id, ex.muscle);
        exName.set(ex.id, ex.name);
        exRepMin.set(ex.id, ex.isCardio ? null : repTargetMin(ex.repTarget));
        exIsCardio.set(ex.id, ex.isCardio);
        const m = ex.muscle;
        setsByMuscle[m] ??= { done: 0, prescribed: 0 };
        setsByMuscle[m].prescribed += ex.warmupSets + ex.workingSets;
      }

      const session = sessionByDay.get(day.id);
      const doneSets = session
        ? session.setEntries.filter((e) => e.done).length
        : 0;
      doneSetsTotal += doneSets;
      wa.doneSets += doneSets;

      if (session) {
        for (const e of session.setEntries) {
          if (!e.done) continue;
          const m = exMuscle.get(e.planExerciseId) ?? "Other";
          setsByMuscle[m] ??= { done: 0, prescribed: 0 };
          setsByMuscle[m].done += 1;

          // Rep-quality: only working sets with a measurable numeric target
          // (excludes cardio and "to failure" schemes).
          const repMin = exRepMin.get(e.planExerciseId);
          if (
            e.setType === "work" &&
            !exIsCardio.get(e.planExerciseId) &&
            repMin != null
          ) {
            workingSetsDone += 1;
            if (e.reps != null && e.reps >= repMin) workingSetsOnTarget += 1;
          }

          if (e.weight && e.reps) {
            const vol = e.weight * e.reps;
            volumeByMuscle[m] = (volumeByMuscle[m] ?? 0) + vol;
            wa.volume += vol;

            // Personal records by exercise name.
            const name = exName.get(e.planExerciseId) ?? "Exercise";
            const cur = prByName.get(name);
            if (!cur || e.weight > cur.maxWeight) {
              prByName.set(name, {
                name,
                muscle: m,
                maxWeight: e.weight,
                repsAtMax: e.reps,
                bestVolume: Math.max(vol, cur?.bestVolume ?? 0),
                date: session.performedDate,
              });
            } else if (vol > cur.bestVolume) {
              cur.bestVolume = vol;
            }
          }
        }
      }

      const status: DayProgress["status"] = !session
        ? "not_started"
        : session.status === "completed"
          ? "completed"
          : "in_progress";
      if (status === "completed") {
        completedWorkouts += 1;
        wa.completedWorkouts += 1;
      }

      const isTraining = !day.focus.toLowerCase().includes("rest");
      if (isTraining) {
        wa.trainingDays += 1;
        if (status === "completed") wa.trainingDone += 1;
      }

      const nonCardio = day.exercises.filter((e) => !e.isCardio);
      const cardioCount = day.exercises.length - nonCardio.length;
      const nonCardioSets = nonCardio.reduce(
        (s, e) => s + e.warmupSets + e.workingSets,
        0
      );

      days.push({
        dayId: day.id,
        weekNumber: week.number,
        label: day.label,
        focus: day.focus,
        status,
        prescribedSets: prescribed,
        doneSets,
        exerciseCount: nonCardio.length,
        estMinutes: Math.round(nonCardioSets * 3 + cardioCount * 15),
        performedDate: session?.performedDate ?? null,
      });
    }
  }

  const pct = (a: number, b: number) =>
    b === 0 ? 0 : Math.round((a / b) * 100);

  let totalVolume = 0;
  for (const v of Object.values(volumeByMuscle)) totalVolume += v;

  const weekly = [...weekAgg.values()]
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((w) => ({
      ...w,
      setAdherence: pct(w.doneSets, w.prescribedSets),
      workoutAdherence: pct(w.completedWorkouts, w.prescribedWorkouts),
      trainingPct: pct(w.trainingDone, w.trainingDays),
      completed: w.trainingDays > 0 && w.trainingDone >= w.trainingDays,
    }));

  const prs = [...prByName.values()].sort((a, b) => b.maxWeight - a.maxWeight);

  // Streak + loggedToday (derived here so the dashboard needs only one scan).
  const activeDates = new Set<string>();
  for (const s of enrollment?.sessions ?? [])
    if (s.setEntries.some((e) => e.done)) activeDates.add(ymd(s.performedDate));
  const loggedToday = activeDates.has(ymd(new Date()));
  const currentStreak = streakLength(activeDates);

  return {
    plan,
    enrolled: !!enrollment,
    loggedToday,
    currentStreak,
    startDate: enrollment?.startDate ?? null,
    startedAt: enrollment?.startedAt ?? null,
    started: !!enrollment?.startedAt,
    days,
    weeksSeeded: plan.weeks.length,
    totalWeeks: plan.totalWeeks,
    prescribedWorkouts,
    completedWorkouts,
    prescribedSetsTotal,
    doneSetsTotal,
    workoutAdherence: pct(completedWorkouts, prescribedWorkouts),
    setAdherence: pct(doneSetsTotal, prescribedSetsTotal),
    repQuality: pct(workingSetsOnTarget, workingSetsDone),
    workingSetsDone,
    workingSetsOnTarget,
    volumeByMuscle,
    setsByMuscle,
    totalVolume,
    weekly,
    prs,
  };
}

export type TimelineDay = {
  dayId: string;
  index: number; // 1-based plan day number (1..N)
  weekNumber: number;
  dayInWeek: number; // 1..7
  focus: string;
  isRest: boolean;
  status: DayProgress["status"];
  date: Date; // scheduled calendar date
  performedDate: Date | null;
  isToday: boolean;
  isPast: boolean; // scheduled strictly before today
  isFuture: boolean; // scheduled strictly after today
  missed: boolean; // a past training day that wasn't completed
};

export type Timeline = {
  started: boolean; // user pressed "Start program"
  startDate: Date;
  endDate: Date;
  totalDays: number;
  currentDayIndex: number; // where the schedule says you are today (1..totalDays)
  currentWeek: number;
  daysElapsed: number; // calendar days since start (0 on day 1)
  hasStarted: boolean; // today >= startDate
  hasFinished: boolean; // today > endDate
  completedWorkouts: number;
  totalWorkouts: number; // training (non-rest) days in the plan
  // schedule vs. actual, measured in workouts that should be done by today
  dueByToday: number;
  doneByToday: number;
  behind: number; // dueByToday - doneByToday, clamped at 0
  days: TimelineDay[];
};

type ProgressResult = NonNullable<Awaited<ReturnType<typeof getProgress>>>;

/**
 * Overlay calendar dates onto the plan: maps each plan day to a real date
 * (startDate + offset), and compares where the schedule says you are today
 * against what you've actually completed. Pure — reuses an existing
 * getProgress() result so no extra DB work.
 */
export function buildTimeline(p: ProgressResult, today: Date = new Date()): Timeline {
  // Day 1 is anchored on when the user pressed "Start program". Before that,
  // fall back to today so the preview grid starts "now".
  const start = startOfDay(p.startedAt ?? today);
  const t = startOfDay(today);
  const totalDays = p.days.length;

  const days: TimelineDay[] = p.days.map((d, i) => {
    const date = addDays(start, i);
    const isRest = d.focus.toLowerCase().includes("rest");
    const isPast = +date < +t;
    const isToday = +date === +t;
    return {
      dayId: d.dayId,
      index: i + 1,
      weekNumber: d.weekNumber,
      dayInWeek: (i % 7) + 1,
      focus: d.focus,
      isRest,
      status: d.status,
      date,
      performedDate: d.performedDate,
      isToday,
      isPast,
      isFuture: +date > +t,
      missed: isPast && !isRest && d.status !== "completed",
    };
  });

  const daysElapsed = daysBetween(start, t); // can be negative if not started
  const currentDayIndex = Math.min(Math.max(daysElapsed + 1, 1), totalDays || 1);
  const endDate = addDays(start, Math.max(totalDays - 1, 0));

  const dueByToday = days.filter((d) => !d.isRest && !d.isFuture).length;
  const doneByToday = days.filter(
    (d) => !d.isRest && !d.isFuture && d.status === "completed"
  ).length;
  const totalWorkouts = days.filter((d) => !d.isRest).length;
  const completedWorkouts = days.filter(
    (d) => !d.isRest && d.status === "completed"
  ).length;

  return {
    started: p.started,
    startDate: start,
    endDate,
    totalDays,
    currentDayIndex,
    currentWeek: days[currentDayIndex - 1]?.weekNumber ?? 1,
    daysElapsed,
    hasStarted: +t >= +start,
    hasFinished: +t > +endDate,
    completedWorkouts,
    totalWorkouts,
    dueByToday,
    doneByToday,
    behind: Math.max(0, dueByToday - doneByToday),
    days,
  };
}

/**
 * True when every training day of the plan has a completed session for this
 * enrollment. The same count saveWorkoutAction uses to fire the
 * program-complete celebration; extracted so the Day-85 flow shares it.
 */
export async function isProgramComplete(
  enrollmentId: string,
  planId: string
): Promise<boolean> {
  const allDays = await prisma.workoutDay.findMany({
    where: { week: { planId } },
    select: { id: true, focus: true },
  });
  const trainingIds = allDays
    .filter((d) => !d.focus.toLowerCase().includes("rest"))
    .map((d) => d.id);
  if (trainingIds.length === 0) return false;
  const done = await prisma.workoutSession.count({
    where: {
      enrollmentId,
      workoutDayId: { in: trainingIds },
      status: "completed",
    },
  });
  return done >= trainingIds.length;
}
