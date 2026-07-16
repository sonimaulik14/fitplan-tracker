import { prisma } from "../prisma";
import { todayKey } from "../date";
import { parseSupplements } from "../ui";

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
