"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { LIFT_CATEGORIES } from "../ui";

/** Save a 1RM test-day result. weightKg is stored in kg (caller converts). */
export async function logLiftTestAction(
  liftKey: string,
  weightKg: number,
  reps: number
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!LIFT_CATEGORIES.some((c) => c.key === liftKey))
    return { ok: false, error: "Unknown lift." };
  if (!weightKg || weightKg <= 0 || weightKg > 700)
    return { ok: false, error: "Enter a valid weight." };
  const r = Math.round(reps);
  if (!Number.isFinite(r) || r < 1 || r > 10)
    return { ok: false, error: "Reps must be 1-10." };

  await prisma.liftTest.create({
    data: { userId: user.id, liftKey, weightKg, reps: r },
  });
  revalidatePath("/strength");
  return { ok: true };
}
