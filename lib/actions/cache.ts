"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";

export async function resetExerciseCacheAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { count } = await prisma.exerciseMedia.deleteMany({});
  revalidatePath("/exercise", "layout");
  return { ok: true, count };
}

export async function resetPhotoCacheAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { count } = await prisma.photoCache.deleteMany({});
  revalidatePath("/", "layout");
  return { ok: true, count };
}
