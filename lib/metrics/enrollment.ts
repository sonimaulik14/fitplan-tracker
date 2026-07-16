import { prisma } from "../prisma";

/**
 * THE canonical "which enrollment" resolver. With repeatable cycles a user
 * can have several rows per plan (completed cycle 1, active cycle 2, …) — a
 * bare findFirst would pick an arbitrary one. Always resolve through here:
 * the active enrollment, newest cycle first.
 */
export async function getActiveEnrollment(userId: string, planId?: string) {
  return prisma.enrollment.findFirst({
    where: { userId, ...(planId ? { planId } : {}), status: "active" },
    orderBy: [{ cycle: "desc" }, { startDate: "desc" }],
  });
}

/**
 * Effective exercise-name overrides for the user's ACTIVE enrollment on a
 * plan. Scoped per cycle — a new cycle starts from the copied-over swaps it
 * was created with, never from a stale sibling cycle.
 */
export async function getSwaps(userId: string, planId: string) {
  const enrollment = await getActiveEnrollment(userId, planId);
  if (!enrollment) return new Map<string, string>();
  const swaps = await prisma.exerciseSwap.findMany({
    where: { enrollmentId: enrollment.id },
  });
  return new Map(swaps.map((s) => [s.planExerciseId, s.name]));
}
