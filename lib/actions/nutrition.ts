"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { getActiveEnrollment } from "../metrics/enrollment";
import { serializeSupplements } from "../ui";
import { todayKey } from "../date";

export async function addNutritionEntryAction(input: {
  label: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const label = input.label?.trim();
  if (!label) return { ok: false, error: "Name your food." };
  const num = (v: number | undefined) =>
    v == null || Number.isNaN(v) || v < 0 ? 0 : Math.min(v, 100000);
  await prisma.nutritionEntry.create({
    data: {
      userId: user.id,
      day: todayKey(),
      label: label.slice(0, 80),
      calories: num(input.calories),
      proteinG: num(input.proteinG),
      carbsG: num(input.carbsG),
      fatG: num(input.fatG),
    },
  });
  revalidatePath("/nutrition");
  return { ok: true };
}

export async function deleteNutritionEntryAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  await prisma.nutritionEntry.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/nutrition");
  return { ok: true };
}

export async function adjustWaterAction(deltaMl: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const day = todayKey();
  const existing = await prisma.dailyLog.findUnique({
    where: { userId_day: { userId: user.id, day } },
  });
  const next = Math.max(0, Math.min(20000, (existing?.waterMl ?? 0) + deltaMl));
  await prisma.dailyLog.upsert({
    where: { userId_day: { userId: user.id, day } },
    create: { userId: user.id, day, waterMl: next },
    update: { waterMl: next },
  });
  revalidatePath("/nutrition");
  return { ok: true, waterMl: next };
}

// Toggle a supplement as taken for a specific WORKOUT DAY (not the calendar
// date), so each program day has its own independent log. Scoped to the
// active enrollment — a fresh cycle starts with empty checklists.
export async function toggleDaySupplementAction(
  workoutDayId: string,
  name: string
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const day = await prisma.workoutDay.findUnique({
    where: { id: workoutDayId },
    select: { week: { select: { planId: true } } },
  });
  if (!day) return { ok: false, error: "Workout not found." };
  const enrollment = await getActiveEnrollment(user.id, day.week.planId);
  if (!enrollment) return { ok: false, error: "Not enrolled." };

  const existing = await prisma.workoutDaySupplementLog.findUnique({
    where: {
      enrollmentId_workoutDayId: { enrollmentId: enrollment.id, workoutDayId },
    },
  });
  const set = new Set(
    (existing?.supplementsTaken ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (set.has(name)) set.delete(name);
  else set.add(name);
  const csv = [...set].join(",");
  await prisma.workoutDaySupplementLog.upsert({
    where: {
      enrollmentId_workoutDayId: { enrollmentId: enrollment.id, workoutDayId },
    },
    create: { enrollmentId: enrollment.id, workoutDayId, supplementsTaken: csv },
    update: { supplementsTaken: csv },
  });
  revalidatePath(`/workout/${workoutDayId}`);
  return { ok: true };
}

export async function setNutritionGoalsAction(input: {
  calorieGoal: number | null;
  proteinGoal: number | null;
  supplements: { name: string; dose: number | null; unit: string }[] | null;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const clampInt = (v: number | null, max: number) =>
    v == null || Number.isNaN(v) || v <= 0 ? null : Math.min(Math.round(v), max);
  const supplements = serializeSupplements(
    (input.supplements ?? []).map((s) => ({
      name: s.name,
      // clamp dose to a sane range; null if not a positive number
      dose:
        typeof s.dose === "number" && isFinite(s.dose) && s.dose > 0
          ? Math.min(s.dose, 100000)
          : null,
      unit: s.unit,
    }))
  );
  await prisma.user.update({
    where: { id: user.id },
    data: {
      calorieGoal: clampInt(input.calorieGoal, 20000),
      proteinGoal: clampInt(input.proteinGoal, 2000),
      supplements,
    },
  });
  revalidatePath("/nutrition");
  return { ok: true };
}
