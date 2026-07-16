import { prisma } from "../prisma";
import { ymd } from "../date";

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
