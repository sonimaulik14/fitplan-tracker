import { prisma } from "../prisma";
import { slugify } from "../ui";
import { getActiveEnrollment } from "./enrollment";

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
    const enr = await getActiveEnrollment(userId);
    if (!enr) return null;
    return prisma.plan.findUnique({
      where: { id: enr.planId },
      include: PLAN_INCLUDE,
    });
  }
  return prisma.plan.findFirst({ include: PLAN_INCLUDE });
}

// All plans the user can choose from — built-ins plus their own custom
// programs — with light summary stats for the picker.
export async function getAllPlans(userId?: string) {
  const plans = await prisma.plan.findMany({
    where: userId
      ? { OR: [{ ownerId: null }, { ownerId: userId }] }
      : { ownerId: null },
    orderBy: [{ ownerId: "asc" }, { totalWeeks: "asc" }],
    include: {
      weeks: { take: 1, orderBy: { number: "asc" }, include: { days: true } },
      _count: { select: { weeks: true } },
    },
  });
  return plans.map((pl) => ({
    id: pl.id,
    name: pl.name,
    description: pl.description,
    totalWeeks: pl.totalWeeks,
    custom: pl.ownerId != null,
    builtWeeks: pl._count.weeks,
    daysPerWeek: pl.weeks[0]
      ? pl.weeks[0].days.filter(
          (d) => !d.focus.toLowerCase().includes("rest")
        ).length
      : 0,
  }));
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
