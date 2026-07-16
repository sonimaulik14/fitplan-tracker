import { prisma } from "../prisma";

/** Effective exercise-name overrides for a user's plan enrollment. */
export async function getSwaps(userId: string, planId: string) {
  const swaps = await prisma.exerciseSwap.findMany({
    where: { enrollment: { userId, planId } },
  });
  return new Map(swaps.map((s) => [s.planExerciseId, s.name]));
}
