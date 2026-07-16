"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";

// Custom program authoring. Built-in plans (ownerId null) are untouchable;
// a user can create, edit and delete only their own.

export type DraftExercise = {
  name: string;
  muscle: string;
  groupLabel?: string | null;
  warmupSets: number;
  workingSets: number;
  repTarget: string;
  isCardio: boolean;
};

export type DraftDay = {
  dayNumber: number; // 1..7
  label: string;
  focus: string; // "Rest" makes it a rest day
  exercises: DraftExercise[];
};

export type DraftWeek = {
  number: number; // 1..totalWeeks
  style?: string | null;
  days: DraftDay[]; // exactly 7
};

export type PlanDraft = {
  id?: string; // present = edit
  name: string;
  description: string;
  weeks: DraftWeek[];
};

const MUSCLES = new Set([
  "Legs",
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Calves",
  "Abs",
  "Cardio",
  "Other",
]);

function validate(draft: PlanDraft): string | null {
  const name = draft.name?.trim();
  if (!name || name.length < 3 || name.length > 60)
    return "Give the program a name (3–60 characters).";
  if ((draft.description ?? "").length > 300) return "Description is too long.";
  if (!Array.isArray(draft.weeks) || draft.weeks.length < 1 || draft.weeks.length > 16)
    return "A program needs 1–16 weeks.";
  let exerciseCount = 0;
  for (const [wi, w] of draft.weeks.entries()) {
    if (w.number !== wi + 1) return "Weeks must be numbered consecutively.";
    if (!Array.isArray(w.days) || w.days.length !== 7)
      return `Week ${w.number} must have exactly 7 days.`;
    for (const [di, d] of w.days.entries()) {
      if (d.dayNumber !== di + 1) return "Days must be numbered 1–7.";
      if (!d.focus?.trim() || d.focus.length > 60)
        return `Week ${w.number}, day ${d.dayNumber}: set a focus.`;
      if (!d.label?.trim() || d.label.length > 60)
        return `Week ${w.number}, day ${d.dayNumber}: set a label.`;
      if (d.exercises.length > 15)
        return `Week ${w.number}, day ${d.dayNumber}: 15 exercises max.`;
      for (const ex of d.exercises) {
        exerciseCount++;
        if (!ex.name?.trim() || ex.name.length > 80)
          return `Week ${w.number}, day ${d.dayNumber}: every exercise needs a name.`;
        if (!MUSCLES.has(ex.muscle)) return `"${ex.name}": pick a muscle group.`;
        if (!ex.repTarget?.trim() || ex.repTarget.length > 20)
          return `"${ex.name}": set a rep target (e.g. 8-12).`;
        const ints = [ex.warmupSets, ex.workingSets];
        if (ints.some((n) => !Number.isInteger(n) || n < 0 || n > 10))
          return `"${ex.name}": sets must be whole numbers 0–10.`;
        if (!ex.isCardio && ex.warmupSets + ex.workingSets < 1)
          return `"${ex.name}": add at least one set.`;
        if ((ex.groupLabel ?? "").length > 30)
          return `"${ex.name}": group label too long.`;
      }
    }
  }
  if (exerciseCount === 0) return "Add at least one exercise to the program.";
  return null;
}

const weekCreateData = (w: DraftWeek) => ({
  number: w.number,
  style: w.style?.trim() || null,
  days: {
    create: w.days.map((d) => ({
      dayNumber: d.dayNumber,
      label: d.label.trim(),
      focus: d.focus.trim(),
      orderIndex: d.dayNumber,
      exercises: {
        create: d.exercises.map((ex, i) => ({
          name: ex.name.trim(),
          muscle: ex.muscle,
          groupLabel: ex.groupLabel?.trim() || null,
          orderIndex: i,
          warmupSets: ex.isCardio ? 0 : ex.warmupSets,
          workingSets: ex.isCardio ? Math.max(1, ex.workingSets) : ex.workingSets,
          repTarget: ex.repTarget.trim(),
          isCardio: ex.isCardio,
        })),
      },
    })),
  },
});

export async function savePlanAction(
  draft: PlanDraft
): Promise<{ ok: boolean; error?: string; planId?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const invalid = validate(draft);
  if (invalid) return { ok: false, error: invalid };

  const meta = {
    name: draft.name.trim(),
    description: draft.description?.trim() || null,
    totalWeeks: draft.weeks.length,
  };

  if (!draft.id) {
    const plan = await prisma.plan.create({
      data: {
        ...meta,
        ownerId: user.id,
        weeks: { create: draft.weeks.map(weekCreateData) },
      },
    });
    revalidatePath("/plans");
    return { ok: true, planId: plan.id };
  }

  // Edit: must own it, and structure is locked once anything has been logged
  // (replacing exercises would orphan logged sets).
  const plan = await prisma.plan.findUnique({
    where: { id: draft.id },
    select: { id: true, ownerId: true },
  });
  if (!plan || plan.ownerId !== user.id)
    return { ok: false, error: "Program not found." };

  const logged = await prisma.workoutSession.count({
    where: { enrollment: { planId: plan.id } },
  });
  if (logged > 0) {
    await prisma.plan.update({
      where: { id: plan.id },
      data: { name: meta.name, description: meta.description },
    });
    revalidatePath("/plans");
    return {
      ok: true,
      planId: plan.id,
      error:
        "Workouts are already logged against this program, so only the name and description were updated.",
    };
  }

  await prisma.$transaction(async (tx) => {
    // No sessions ⇒ no set entries; weeks cascade days + exercises. Clear any
    // pre-workout swaps that pointed at the old exercise rows.
    await tx.week.deleteMany({ where: { planId: plan.id } });
    await tx.exerciseSwap.deleteMany({
      where: { enrollment: { planId: plan.id } },
    });
    await tx.plan.update({
      where: { id: plan.id },
      data: { ...meta, weeks: { create: draft.weeks.map(weekCreateData) } },
    });
  });
  revalidatePath("/plans");
  revalidatePath("/dashboard");
  return { ok: true, planId: plan.id };
}

export async function deletePlanAction(
  planId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { ownerId: true },
  });
  if (!plan || plan.ownerId !== user.id)
    return { ok: false, error: "Program not found." };
  // Cascades enrollments → sessions → set entries. The UI warns before this.
  await prisma.plan.delete({ where: { id: planId } });
  revalidatePath("/plans");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Full draft for the edit screen (owner only). */
export async function getPlanDraftAction(
  planId: string
): Promise<{ ok: boolean; error?: string; draft?: PlanDraft; locked?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      weeks: {
        orderBy: { number: "asc" },
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            include: { exercises: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  });
  if (!plan || plan.ownerId !== user.id)
    return { ok: false, error: "Program not found." };
  const logged = await prisma.workoutSession.count({
    where: { enrollment: { planId } },
  });
  return {
    ok: true,
    locked: logged > 0,
    draft: {
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      weeks: plan.weeks.map((w) => ({
        number: w.number,
        style: w.style,
        days: w.days.map((d) => ({
          dayNumber: d.dayNumber,
          label: d.label,
          focus: d.focus,
          exercises: d.exercises.map((ex) => ({
            name: ex.name,
            muscle: ex.muscle,
            groupLabel: ex.groupLabel,
            warmupSets: ex.warmupSets,
            workingSets: ex.workingSets,
            repTarget: ex.repTarget,
            isCardio: ex.isCardio,
          })),
        })),
      })),
    },
  };
}
