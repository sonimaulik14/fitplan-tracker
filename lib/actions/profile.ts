"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { unitToKg } from "../ui";
import { storeImage } from "../storage";
import { isSafeImageDataUrl } from "./shared";

export type OnboardingInput = {
  goal: string;
  unit: "kg" | "lb";
  trainingDays: number[];
  reminderTime: string;
  remindersOn: boolean;
  bodyweight: number | null; // in chosen unit
};

export async function completeOnboardingAction(input: OnboardingInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      goal: input.goal || null,
      unit: input.unit,
      trainingDays: input.trainingDays.length
        ? input.trainingDays.sort((a, b) => a - b).join(",")
        : null,
      reminderTime: input.reminderTime || "18:00",
      remindersOn: input.remindersOn,
      onboardedAt: new Date(),
    },
  });

  // Note: no auto-enroll — after onboarding the user lands on the dashboard's
  // plan picker and chooses which program to start.

  // Optional starting weigh-in (convert chosen unit → kg).
  if (input.bodyweight && input.bodyweight > 0) {
    await prisma.bodyMetric.create({
      data: { userId: user.id, weightKg: unitToKg(input.bodyweight, input.unit) },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAvatarAction(dataUrl: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!isSafeImageDataUrl(dataUrl))
    return { ok: false, error: "Invalid image." };
  if (dataUrl.length > 1_500_000)
    return { ok: false, error: "Image too large." };
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: await storeImage(dataUrl, "avatars") },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeAvatarAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setUnitAction(unit: "kg" | "lb") {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await prisma.user.update({ where: { id: user.id }, data: { unit } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateRemindersAction(input: {
  remindersOn: boolean;
  reminderTime: string;
  trainingDays: number[];
  timezone?: string;
  weeklyReviewOn?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const time = /^\d{2}:\d{2}$/.test(input.reminderTime)
    ? input.reminderTime
    : "18:00";
  const days = [...new Set(input.trainingDays)]
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      remindersOn: input.remindersOn,
      reminderTime: time,
      trainingDays: days.length ? days.join(",") : null,
      ...(typeof input.weeklyReviewOn === "boolean"
        ? { weeklyReviewOn: input.weeklyReviewOn }
        : {}),
      ...(input.timezone && input.timezone.length < 64
        ? { timezone: input.timezone }
        : {}),
    },
  });
  revalidatePath("/account");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setGoalWeightAction(goalWeightKg: number | null) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (goalWeightKg != null && (goalWeightKg <= 0 || goalWeightKg > 700))
    return { ok: false, error: "Enter a valid goal weight." };
  await prisma.user.update({
    where: { id: user.id },
    data: { goalWeightKg },
  });
  revalidatePath("/measurements");
  return { ok: true };
}
