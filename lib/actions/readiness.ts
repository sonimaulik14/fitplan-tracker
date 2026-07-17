"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { dayKeyInTz } from "../date";

// Partial by design: the dashboard card saves one answer per tap, so an
// update must never clobber the other two fields (or water/supplements).
// Null clears an answer (tap the active segment again).
export async function saveReadinessAction(input: {
  sleepQuality?: number | null;
  soreness?: number | null;
  energy?: number | null;
}): Promise<{ ok: boolean; error?: string; day?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const clamp = (v: number | null | undefined) =>
    v == null ? null : Math.min(5, Math.max(1, Math.round(v)));
  const data: Record<string, number | null> = {};
  if ("sleepQuality" in input) data.sleepQuality = clamp(input.sleepQuality);
  if ("soreness" in input) data.soreness = clamp(input.soreness);
  if ("energy" in input) data.energy = clamp(input.energy);
  if (Object.keys(data).length === 0)
    return { ok: false, error: "Nothing to save." };

  // Tz-aware key so a 5am check-in lands on the user's day, not the server's.
  const day = dayKeyInTz(user.timezone);
  await prisma.dailyLog.upsert({
    where: { userId_day: { userId: user.id, day } },
    create: { userId: user.id, day, ...data },
    update: data,
  });
  revalidatePath("/dashboard");
  revalidatePath("/workout/[dayId]", "page");
  return { ok: true, day };
}
