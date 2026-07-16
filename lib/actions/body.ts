"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { storeImage } from "../storage";
import { isSafeImageDataUrl } from "./shared";

export async function logBodyweightAction(weightKg: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!weightKg || weightKg <= 0 || weightKg > 700)
    return { ok: false, error: "Enter a valid weight." };
  await prisma.bodyMetric.create({ data: { userId: user.id, weightKg } });
  revalidatePath("/progress");
  return { ok: true };
}

export async function logMeasurementsAction(input: {
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  armsCm?: number | null;
  thighsCm?: number | null;
  bodyFat?: number | null;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const clean = (v: number | null | undefined, max: number) =>
    v == null || Number.isNaN(v) || v <= 0 || v > max ? null : v;
  const data = {
    userId: user.id,
    chestCm: clean(input.chestCm, 300),
    waistCm: clean(input.waistCm, 300),
    hipsCm: clean(input.hipsCm, 300),
    armsCm: clean(input.armsCm, 150),
    thighsCm: clean(input.thighsCm, 200),
    bodyFat: clean(input.bodyFat, 80),
  };
  if (
    data.chestCm == null &&
    data.waistCm == null &&
    data.hipsCm == null &&
    data.armsCm == null &&
    data.thighsCm == null &&
    data.bodyFat == null
  )
    return { ok: false, error: "Enter at least one measurement." };
  await prisma.bodyMetric.create({ data });
  revalidatePath("/measurements");
  return { ok: true };
}

export async function addProgressPhotoAction(dataUrl: string, note?: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!isSafeImageDataUrl(dataUrl))
    return { ok: false, error: "Invalid image." };
  if (dataUrl.length > 3_500_000)
    return { ok: false, error: "Image too large — try a smaller photo." };
  await prisma.progressPhoto.create({
    data: { userId: user.id, dataUrl: await storeImage(dataUrl, "photos"), note: note || null },
  });
  revalidatePath("/progress");
  return { ok: true };
}

export async function deleteProgressPhotoAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  await prisma.progressPhoto.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/progress");
  return { ok: true };
}
