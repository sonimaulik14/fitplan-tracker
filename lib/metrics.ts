import { prisma } from "./prisma";
import { ymd, streakLength, todayKey, startOfDay, addDays, daysBetween } from "./date";
import { slugify, parseSupplements } from "./ui";

export { todayKey };

const PLAN_INCLUDE = {
  weeks: {
    orderBy: { number: "asc" as const },
    include: {
      days: {
        orderBy: { orderIndex: "asc" as const },
        include: { exercises: { orderBy: { orderIndex: "asc" as const } } },
      },
    },
  },
};

// The plan to show a user. With a userId, returns the plan from their active
// enrollment (so each user sees the plan they started), or null if they haven't
// enrolled yet. With no userId, falls back to the first plan (browse contexts).
export async function getActivePlan(userId?: string) {
  if (userId) {
    const enr = await prisma.enrollment.findFirst({
      where: { userId, status: "active" },
      orderBy: { startDate: "desc" },
    });
    if (!enr) return null;
    return prisma.plan.findUnique({
      where: { id: enr.planId },
      include: PLAN_INCLUDE,
    });
  }
  return prisma.plan.findFirst({ include: PLAN_INCLUDE });
}

// All plans the user can choose from, with light summary stats for the picker.
export async function getAllPlans() {
  const plans = await prisma.plan.findMany({
    orderBy: { totalWeeks: "asc" },
    include: { weeks: { take: 1, orderBy: { number: "asc" }, include: { days: true } } },
  });
  return plans.map((pl) => ({
    id: pl.id,
    name: pl.name,
    description: pl.description,
    totalWeeks: pl.totalWeeks,
    daysPerWeek: pl.weeks[0]
      ? pl.weeks[0].days.filter(
          (d) => !d.focus.toLowerCase().includes("rest")
        ).length
      : 0,
  }));
}

/**
 * Pull the lower bound of a rep target string ("12-20 (to failure)" -> 12,
 * "6-8" -> 6, "20" -> 20, "7 / 7 / 7" -> 21). Returns null when there's no
 * meaningful rep count (e.g. "40 steps", "20 min").
 */
export function repTargetMin(target: string): number | null {
  const t = target.toLowerCase();
  if (t.includes("min") || t.includes("step")) return null;
  // Comma-separated pyramids (DTP, e.g. "30, 25, 20, 15, 10, 5") have no single
  // rep target — exclude them from rep-quality scoring.
  if (t.includes(",")) return null;
  // sets like "7 / 7 / 7" -> total reps
  if (/\d+\s*\/\s*\d+/.test(t)) {
    const nums = t.match(/\d+/g)?.map(Number) ?? [];
    return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
  }
  const range = t.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return Number(range[1]);
  const single = t.match(/\d+/);
  return single ? Number(single[0]) : null;
}

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

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, planId: plan.id },
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


/** Today's food entries, macro totals, water + supplement state, and goals. */
export async function getNutritionToday(userId: string) {
  const day = todayKey();
  const [user, entries, log] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { calorieGoal: true, proteinGoal: true, supplements: true },
    }),
    prisma.nutritionEntry.findMany({
      where: { userId, day },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dailyLog.findUnique({
      where: { userId_day: { userId, day } },
    }),
  ]);

  const totals = entries.reduce(
    (t, e) => ({
      calories: t.calories + e.calories,
      proteinG: t.proteinG + e.proteinG,
      carbsG: t.carbsG + e.carbsG,
      fatG: t.fatG + e.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const supplements = parseSupplements(user?.supplements);
  const taken = new Set(
    (log?.supplementsTaken ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  return {
    day,
    entries,
    totals,
    waterMl: log?.waterMl ?? 0,
    calorieGoal: user?.calorieGoal ?? null,
    proteinGoal: user?.proteinGoal ?? null,
    supplements: supplements.map((s) => ({ ...s, taken: taken.has(s.name) })),
  };
}

// Supplement definitions + whether each was logged for a specific WORKOUT DAY.
// Keyed per workout day (wd:<id>) so each program day logs independently.
export async function getDaySupplements(userId: string, workoutDayId: string) {
  const [user, log] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { supplements: true } }),
    prisma.dailyLog.findUnique({
      where: { userId_day: { userId, day: `wd:${workoutDayId}` } },
    }),
  ]);
  const taken = new Set(
    (log?.supplementsTaken ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  );
  return parseSupplements(user?.supplements).map((d) => ({
    ...d,
    taken: taken.has(d.name),
  }));
}

/**
 * Cumulative supplement intake over the active program window (enrollment
 * start → today). Per supplement: days taken, days elapsed, adherence, and
 * total amount (days taken × dose). Powers the "how much did I take" metrics.
 */
export async function getSupplementTotals(userId: string) {
  const [user, enrollment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { supplements: true },
    }),
    prisma.enrollment.findFirst({
      where: { userId, status: "active" },
      orderBy: { startDate: "desc" },
      select: { startDate: true, startedAt: true },
    }),
  ]);
  const defs = parseSupplements(user?.supplements);
  if (defs.length === 0) return { supplements: [], daysElapsed: 0 };

  const start =
    enrollment?.startedAt ??
    enrollment?.startDate ??
    new Date(Date.now() - 84 * 86400000);
  // Per-workout-day logs are keyed "wd:<id>" (see toggleDaySupplementAction).
  const logs = await prisma.dailyLog.findMany({
    where: { userId, day: { startsWith: "wd:" }, supplementsTaken: { not: "" } },
    select: { supplementsTaken: true },
  });

  const counts = new Map<string, number>();
  for (const l of logs)
    for (const name of l.supplementsTaken.split(",").map((s) => s.trim()))
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);

  const daysElapsed = Math.max(
    1,
    Math.floor((Date.now() - start.getTime()) / 86400000) + 1
  );

  return {
    daysElapsed,
    supplements: defs.map((d) => {
      const daysTaken = counts.get(d.name) ?? 0;
      return {
        name: d.name,
        dose: d.dose,
        unit: d.unit,
        daysTaken,
        daysElapsed,
        adherence: Math.round((daysTaken / daysElapsed) * 100),
        totalAmount: d.dose ? +(daysTaken * d.dose).toFixed(2) : null,
      };
    }),
  };
}

/** Streak + calendar heatmap built from logged training activity. */
export async function getActivity(userId: string, days = 119) {
  const sessions = await prisma.workoutSession.findMany({
    where: { enrollment: { userId } },
    include: { setEntries: true },
  });

  const byDate = new Map<string, number>();
  for (const s of sessions) {
    const done = s.setEntries.filter((e) => e.done).length;
    if (done === 0) continue;
    const key = ymd(s.performedDate);
    byDate.set(key, (byDate.get(key) ?? 0) + done);
  }

  const activeDates = [...byDate.keys()].sort();
  const totalActiveDays = activeDates.length;

  // longest streak (consecutive calendar days)
  const dayMs = 86400000;
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of activeDates) {
    const t = new Date(d + "T00:00:00").getTime();
    run = prev !== null && t - prev === dayMs ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }

  // current streak (consecutive days ending today or yesterday), DST-safe
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = streakLength(new Set(byDate.keys()));

  // this week (last 7 days) active count
  let thisWeek = 0;
  for (let i = 0; i < 7; i++) {
    if (byDate.has(ymd(new Date(today.getTime() - i * dayMs)))) thisWeek += 1;
  }

  // heatmap grid for the last `days` days, aligned to weeks (Sun..Sat columns)
  const maxCount = Math.max(1, ...byDate.values());
  const grid: { date: string; count: number; level: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(today.getTime() - i * dayMs);
    const key = ymd(dt);
    const count = byDate.get(key) ?? 0;
    const level =
      count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4));
    grid.push({ date: key, count, level });
  }

  return { current, longest, totalActiveDays, thisWeek, grid };
}

export type ActivitySummary = Awaited<ReturnType<typeof getActivity>>;

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

/** Bodyweight over time, merging standalone weigh-ins and workout-day weights. */
export async function getBodyweightSeries(userId: string) {
  const [metrics, sessions] = await Promise.all([
    prisma.bodyMetric.findMany({ where: { userId } }),
    prisma.workoutSession.findMany({
      where: { enrollment: { userId }, bodyweight: { not: null } },
      select: { performedDate: true, bodyweight: true },
    }),
  ]);

  const byDate = new Map<string, number>();
  // sessions first, explicit weigh-ins win (added after)
  for (const s of sessions)
    if (s.bodyweight != null) byDate.set(ymd(s.performedDate), s.bodyweight);
  for (const m of metrics)
    if (m.weightKg != null) byDate.set(ymd(m.date), m.weightKg);

  return [...byDate.entries()]
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const MEASUREMENT_FIELDS = [
  { key: "chestCm", label: "Chest", icon: "🫁" },
  { key: "waistCm", label: "Waist", icon: "📏" },
  { key: "hipsCm", label: "Hips", icon: "🩳" },
  { key: "armsCm", label: "Arms", icon: "💪" },
  { key: "thighsCm", label: "Thighs", icon: "🦵" },
  { key: "bodyFat", label: "Body fat %", icon: "📉" },
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]["key"];

/**
 * Body-measurement history: every BodyMetric row that carries at least one
 * measurement, plus the most recent value (and change vs first) per field.
 */
export async function getMeasurements(userId: string) {
  const rows = await prisma.bodyMetric.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  const latest: Record<string, { value: number; date: Date } | null> = {};
  const first: Record<string, number | null> = {};
  for (const f of MEASUREMENT_FIELDS) {
    latest[f.key] = null;
    first[f.key] = null;
  }
  const history: {
    date: string;
    values: Partial<Record<MeasurementKey, number>>;
  }[] = [];

  for (const r of rows) {
    const values: Partial<Record<MeasurementKey, number>> = {};
    let any = false;
    for (const f of MEASUREMENT_FIELDS) {
      const v = r[f.key] as number | null;
      if (v != null) {
        values[f.key] = v;
        latest[f.key] = { value: v, date: r.date };
        if (first[f.key] == null) first[f.key] = v;
        any = true;
      }
    }
    if (any) history.push({ date: ymd(r.date), values });
  }

  const summary = MEASUREMENT_FIELDS.map((f) => {
    const cur = latest[f.key];
    const start = first[f.key];
    return {
      key: f.key,
      label: f.label,
      icon: f.icon,
      latest: cur?.value ?? null,
      change: cur && start != null ? cur.value - start : null,
    };
  });

  return { summary, history };
}

export async function getProgressPhotos(userId: string) {
  return prisma.progressPhoto.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
}

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
};

type ProgressLike = {
  completedWorkouts: number;
  doneSetsTotal: number;
  prs: { length: number }[] | { length: number };
  repQuality: number;
  workingSetsDone: number;
  days: { status: string; doneSets: number; prescribedSets: number }[];
};

/** Derive badges purely from already-computed progress + activity. */
export function buildAchievements(
  p: ProgressLike,
  a: ActivitySummary,
  prCount: number
): Achievement[] {
  const perfectDay = p.days.some(
    (d) => d.prescribedSets > 0 && d.doneSets >= d.prescribedSets
  );
  const trainingDays = p.days.filter(
    (d) => d.prescribedSets > 0
  ).length;
  const trainingDone = p.days.filter(
    (d) => d.status === "completed" && d.prescribedSets > 0
  ).length;

  return [
    {
      id: "first",
      title: "First Step",
      desc: "Complete your first workout",
      icon: "🎯",
      unlocked: p.completedWorkouts >= 1,
    },
    {
      id: "sets25",
      title: "Grinder",
      desc: "Log 25 sets",
      icon: "⚙️",
      unlocked: p.doneSetsTotal >= 25,
    },
    {
      id: "sets100",
      title: "Century",
      desc: "Log 100 sets",
      icon: "💯",
      unlocked: p.doneSetsTotal >= 100,
    },
    {
      id: "pr",
      title: "Record Breaker",
      desc: "Log your first weighted PR",
      icon: "🏋️",
      unlocked: prCount >= 1,
    },
    {
      id: "streak3",
      title: "On a Roll",
      desc: "3-day training streak",
      icon: "🔥",
      unlocked: a.longest >= 3,
    },
    {
      id: "streak7",
      title: "Unstoppable",
      desc: "7-day training streak",
      icon: "⚡",
      unlocked: a.longest >= 7,
    },
    {
      id: "perfect",
      title: "Flawless",
      desc: "Finish every set of a workout",
      icon: "✨",
      unlocked: perfectDay,
    },
    {
      id: "repmaster",
      title: "On Target",
      desc: "80%+ rep quality over 20+ sets",
      icon: "🎯",
      unlocked: p.repQuality >= 80 && p.workingSetsDone >= 20,
    },
    {
      id: "week1",
      title: "Week One Done",
      desc: "Complete all training days in a week",
      icon: "🏆",
      unlocked: trainingDays > 0 && trainingDone >= trainingDays,
    },
  ];
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
          enrollment: { userId, planId },
          workoutDayId: { not: excludeWorkoutDayId },
        },
      },
      include: { planExercise: true, session: true },
      orderBy: [{ session: { performedDate: "desc" } }, { setNumber: "desc" }],
    }),
    prisma.exerciseSwap.findMany({
      where: { enrollment: { userId, planId } },
    }),
  ]);

  const swapName = new Map(swaps.map((s) => [s.planExerciseId, s.name]));

  const map: Record<string, { weight: number; reps: number; date: Date }> = {};
  for (const e of entries) {
    // key by the effective (possibly swapped) movement name
    const name = swapName.get(e.planExerciseId) ?? e.planExercise.name;
    if (!map[name]) {
      map[name] = {
        weight: e.weight!,
        reps: e.reps!,
        date: e.session.performedDate,
      };
    }
  }
  return map;
}

/** Epley estimated 1-rep max. */
export function est1RM(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

/** Per-exercise progression history (matched by effective or original name). */
// Map a URL slug (or a legacy encoded name) back to the real exercise name.
// Considers every exercise in the active plan plus any swapped-in names, so it
// resolves even for exercises the user hasn't logged yet.
export async function resolveExerciseSlug(
  userId: string,
  slugOrName: string
): Promise<{ name: string; muscle: string } | null> {
  const decoded = decodeURIComponent(slugOrName);
  const [plan, swaps] = await Promise.all([
    getActivePlan(userId),
    prisma.exerciseSwap.findMany({
      where: { enrollment: { userId } },
      select: { name: true },
    }),
  ]);
  // name -> muscle (plan exercises carry their muscle; swaps default to Other)
  const byName = new Map<string, string>();
  for (const w of plan?.weeks ?? [])
    for (const d of w.days)
      for (const ex of d.exercises)
        if (!byName.has(ex.name)) byName.set(ex.name, ex.muscle);
  for (const s of swaps) if (!byName.has(s.name)) byName.set(s.name, "Other");

  const exact = byName.get(decoded);
  if (exact !== undefined) return { name: decoded, muscle: exact };
  const target = slugify(decoded);
  for (const [n, m] of byName) if (slugify(n) === target) return { name: n, muscle: m };
  return null;
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
    prisma.exerciseSwap.findMany({
      where: { enrollment: { userId } },
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

/** Effective exercise-name overrides for a user's plan enrollment. */
export async function getSwaps(userId: string, planId: string) {
  const swaps = await prisma.exerciseSwap.findMany({
    where: { enrollment: { userId, planId } },
  });
  return new Map(swaps.map((s) => [s.planExerciseId, s.name]));
}
