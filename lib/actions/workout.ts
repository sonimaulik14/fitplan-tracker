"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { getActiveEnrollment } from "../metrics/enrollment";
import { isProgramComplete } from "../metrics/progress";

// Clear all logged sets for a single workout day (deletes that day's session;
// set entries cascade). The day shows as not-started again.
export async function resetDayAction(
  workoutDayId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const day = await prisma.workoutDay.findUnique({
    where: { id: workoutDayId },
    include: { week: true },
  });
  if (!day) return { ok: false, error: "Workout not found." };
  const enrollment = await getActiveEnrollment(user.id, day.week.planId);
  if (!enrollment) return { ok: false, error: "Not enrolled." };

  await prisma.workoutSession.deleteMany({
    where: { enrollmentId: enrollment.id, workoutDayId },
  });
  revalidatePath(`/workout/${workoutDayId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// Wipe all logged progress for the active program and restart from day one
// (deletes every session; set entries cascade; resets the start date). Logged
// body metrics, nutrition and photos are untouched.
export async function resetProgramAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const enrollment = await getActiveEnrollment(user.id);
  if (enrollment) {
    await prisma.workoutSession.deleteMany({
      where: { enrollmentId: enrollment.id },
    });
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { startDate: new Date() },
    });
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function startPlanAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const planId = String(formData.get("planId") ?? "");
  const plan = planId
    ? await prisma.plan.findUnique({ where: { id: planId } })
    : await prisma.plan.findFirst();
  if (!plan) throw new Error("No plan available to start.");

  // Only one active plan at a time — pause any others, then activate this one.
  await prisma.enrollment.updateMany({
    where: { userId: user.id, status: "active" },
    data: { status: "paused" },
  });
  // Reactivate the latest run of this plan unless it was completed; a
  // completed cycle stays archived and a fresh cycle row begins instead.
  const latest = await prisma.enrollment.findFirst({
    where: { userId: user.id, planId: plan.id },
    orderBy: { cycle: "desc" },
  });
  if (latest && latest.status !== "completed") {
    await prisma.enrollment.update({
      where: { id: latest.id },
      data: { status: "active" },
    });
  } else {
    await prisma.enrollment.create({
      data: {
        userId: user.id,
        planId: plan.id,
        cycle: latest ? latest.cycle + 1 : 1,
      },
    });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

type IncomingSet = {
  planExerciseId: string;
  setNumber: number;
  setType: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  done: boolean;
};

type WorkoutMeta = {
  notes?: string | null;
  mood?: string | null;
  bodyweight?: number | null;
};

// Machine-readable failure codes for the offline outbox's retry classifier
// (string matching on error copy would be fragile). "conflict" = a stale
// offline snapshot must not clobber newer server data.
export type SaveWorkoutResult = {
  ok: boolean;
  error?: string;
  code?: "auth" | "not_found" | "not_enrolled" | "conflict";
  weekCompleted?: boolean;
  weekNumber?: number;
  programComplete?: boolean;
};

export async function saveWorkoutAction(
  workoutDayId: string,
  sets: IncomingSet[],
  status: "in_progress" | "completed",
  meta: WorkoutMeta = {},
  // When replaying a queued offline snapshot, the time it was last edited.
  // Live foreground saves omit it (always-win, today's behavior).
  capturedAt?: number
): Promise<SaveWorkoutResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "auth" };

  const day = await prisma.workoutDay.findUnique({
    where: { id: workoutDayId },
    include: { week: true, exercises: { select: { id: true } } },
  });
  if (!day)
    return { ok: false, error: "Workout not found.", code: "not_found" };

  const enrollment = await getActiveEnrollment(user.id, day.week.planId);
  if (!enrollment)
    return {
      ok: false,
      error: "You haven't started this plan.",
      code: "not_enrolled",
    };

  // Cross-device guard: saves are last-write-wins for the WHOLE day (the
  // session's sets are replaced wholesale below). A delayed offline replay
  // older than the session's latest write must not clobber it.
  if (capturedAt != null) {
    const existing = await prisma.workoutSession.findUnique({
      where: {
        enrollmentId_workoutDayId: {
          enrollmentId: enrollment.id,
          workoutDayId,
        },
      },
      select: { performedDate: true },
    });
    if (existing && existing.performedDate.getTime() > capturedAt) {
      return {
        ok: false,
        error: "This workout was updated more recently on another device.",
        code: "conflict",
      };
    }
  }

  // Sanitize client input: drop sets whose exercise doesn't belong to this day
  // (prevents cross-plan pollution), and clamp the numeric fields to sane ranges.
  const validIds = new Set(day.exercises.map((e) => e.id));
  const clamp = (v: number | null, min: number, max: number): number | null =>
    v == null || !Number.isFinite(v) ? null : Math.min(max, Math.max(min, v));
  const clean = sets
    .filter((s) => validIds.has(s.planExerciseId))
    .map((s) => ({
      planExerciseId: s.planExerciseId,
      setNumber: Number.isFinite(s.setNumber)
        ? Math.min(100, Math.max(1, Math.trunc(s.setNumber)))
        : 1,
      setType: s.setType === "warmup" ? "warmup" : "work",
      weight: clamp(s.weight, 0, 2000),
      reps: clamp(s.reps, 0, 1000),
      rpe: clamp(s.rpe, 0, 10),
      done: !!s.done,
    }));

  const session = await prisma.workoutSession.upsert({
    where: {
      enrollmentId_workoutDayId: {
        enrollmentId: enrollment.id,
        workoutDayId,
      },
    },
    update: {
      status,
      performedDate: new Date(),
      notes: meta.notes ?? null,
      mood: meta.mood ?? null,
      bodyweight: meta.bodyweight ?? null,
    },
    create: {
      enrollmentId: enrollment.id,
      workoutDayId,
      status,
      notes: meta.notes ?? null,
      mood: meta.mood ?? null,
      bodyweight: meta.bodyweight ?? null,
    },
  });

  // Replace all set entries for this session with the incoming ones — atomically,
  // so a crash between delete and re-create can never wipe the logged sets.
  await prisma.$transaction(async (tx) => {
    await tx.setEntry.deleteMany({ where: { sessionId: session.id } });
    if (clean.length) {
      await tx.setEntry.createMany({
        data: clean.map((s) => ({ sessionId: session.id, ...s })),
      });
    }
  });

  // Did finishing this complete the whole week (all training days done)?
  let weekCompleted = false;
  if (status === "completed") {
    const weekDays = await prisma.workoutDay.findMany({
      where: { weekId: day.weekId },
      select: { id: true, focus: true },
    });
    const trainingIds = weekDays
      .filter((d) => !d.focus.toLowerCase().includes("rest"))
      .map((d) => d.id);
    const doneCount = await prisma.workoutSession.count({
      where: {
        enrollmentId: enrollment.id,
        workoutDayId: { in: trainingIds },
        status: "completed",
      },
    });
    weekCompleted = trainingIds.length > 0 && doneCount >= trainingIds.length;
  }

  // Did finishing this complete the ENTIRE program (every training day, all
  // released weeks)? Only worth checking when a week just wrapped up.
  let programComplete = false;
  if (weekCompleted) {
    const allTraining = await prisma.workoutDay.findMany({
      where: { week: { planId: day.week.planId } },
      select: { id: true, focus: true },
    });
    const allTrainingIds = allTraining
      .filter((d) => !d.focus.toLowerCase().includes("rest"))
      .map((d) => d.id);
    const allDone = await prisma.workoutSession.count({
      where: {
        enrollmentId: enrollment.id,
        workoutDayId: { in: allTrainingIds },
        status: "completed",
      },
    });
    programComplete =
      allTrainingIds.length > 0 && allDone >= allTrainingIds.length;
  }

  revalidatePath("/dashboard");
  revalidatePath("/analysis");
  revalidatePath("/progress");
  revalidatePath("/achievements");
  revalidatePath(`/workout/${workoutDayId}`);
  return {
    ok: true,
    weekCompleted,
    weekNumber: day.week.number,
    programComplete,
  };
}

export async function swapExerciseAction(
  planExerciseId: string,
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const ex = await prisma.planExercise.findUnique({
    where: { id: planExerciseId },
    include: { workoutDay: { include: { week: true } } },
  });
  if (!ex) return { ok: false, error: "Exercise not found." };

  const enrollment = await getActiveEnrollment(
    user.id,
    ex.workoutDay.week.planId
  );
  if (!enrollment) return { ok: false, error: "Not enrolled." };

  const trimmed = name.trim();
  if (!trimmed || trimmed === ex.name) {
    // reset to original
    await prisma.exerciseSwap.deleteMany({
      where: { enrollmentId: enrollment.id, planExerciseId },
    });
  } else {
    await prisma.exerciseSwap.upsert({
      where: {
        enrollmentId_planExerciseId: {
          enrollmentId: enrollment.id,
          planExerciseId,
        },
      },
      update: { name: trimmed },
      create: { enrollmentId: enrollment.id, planExerciseId, name: trimmed },
    });
  }
  revalidatePath(`/workout/${ex.workoutDayId}`);
  return { ok: true };
}

// Parse a local "YYYY-MM-DD" to a Date at local noon (so the stored UTC instant
// lands on the intended calendar day regardless of zone). A future start is
// allowed (scheduling ahead); just keep it within a sane window.
function parseStartDate(dateStr: string): { date: Date } | { error: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return { error: "Invalid date." };
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  if (Number.isNaN(date.getTime())) return { error: "Invalid date." };
  const now = Date.now();
  const YEAR = 365 * 86_400_000;
  if (date.getTime() > now + YEAR)
    return { error: "That start date is too far in the future." };
  if (date.getTime() < now - 3 * YEAR)
    return { error: "That start date is too far in the past." };
  return { date };
}

/**
 * Begin the active plan. With no date, Day 1 is today; pass a "YYYY-MM-DD" to
 * schedule a start (past or future).
 */
export async function startProgramAction(dateStr?: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  let date: Date;
  if (dateStr) {
    const parsed = parseStartDate(dateStr);
    if ("error" in parsed) return { ok: false, error: parsed.error };
    date = parsed.date;
  } else {
    const now = new Date();
    date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  }

  const enrollment = await getActiveEnrollment(user.id);
  if (!enrollment) return { ok: false, error: "No active plan." };

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { startedAt: date },
  });
  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Adjust the day the user started the plan (drives the timeline). */
export async function setStartDateAction(dateStr: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = parseStartDate(dateStr);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const date = parsed.date;

  const enrollment = await getActiveEnrollment(user.id);
  if (!enrollment) return { ok: false, error: "No active plan." };

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { startedAt: date },
  });
  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Day-85: archive the finished run and begin the next cycle of the same
 * plan. History (sessions, PRs, streaks) stays on the completed enrollment;
 * equipment swaps carry over; the new cycle lands on the existing "Start
 * program / schedule a date" surface (startedAt: null).
 */
export async function startNextCycleAction(): Promise<{
  ok: boolean;
  error?: string;
  cycle?: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const enrollment = await getActiveEnrollment(user.id);
  if (!enrollment) return { ok: false, error: "No active plan." };

  // Restart is offered once the program is fully logged, or once the
  // scheduled 12 weeks have elapsed (a missed day shouldn't wall off the
  // next block).
  const complete = await isProgramComplete(enrollment.id, enrollment.planId);
  if (!complete && enrollment.startedAt) {
    const plan = await prisma.plan.findUnique({
      where: { id: enrollment.planId },
      select: { totalWeeks: true },
    });
    const endMs =
      enrollment.startedAt.getTime() +
      (plan?.totalWeeks ?? 12) * 7 * 86_400_000;
    if (Date.now() < endMs)
      return { ok: false, error: "This program isn't finished yet." };
  } else if (!complete) {
    return { ok: false, error: "This program isn't finished yet." };
  }

  const swaps = await prisma.exerciseSwap.findMany({
    where: { enrollmentId: enrollment.id },
    select: { planExerciseId: true, name: true },
  });

  const next = await prisma.$transaction(async (tx) => {
    await tx.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "completed" },
    });
    const created = await tx.enrollment.create({
      data: {
        userId: user.id,
        planId: enrollment.planId,
        cycle: enrollment.cycle + 1,
        status: "active",
        startedAt: null,
      },
    });
    if (swaps.length) {
      await tx.exerciseSwap.createMany({
        data: swaps.map((s) => ({ ...s, enrollmentId: created.id })),
      });
    }
    return created;
  });

  revalidatePath("/dashboard");
  revalidatePath("/timeline");
  revalidatePath("/plan");
  return { ok: true, cycle: next.cycle };
}

// ---------- catch-up flow ----------

/**
 * Consciously skip a missed day: an empty session with status "skipped" so the
 * day stops counting as behind/missed. Refuses once real sets exist.
 */
export async function skipDayAction(
  workoutDayId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const day = await prisma.workoutDay.findUnique({
    where: { id: workoutDayId },
    include: { week: true },
  });
  if (!day) return { ok: false, error: "Workout not found." };
  const enrollment = await getActiveEnrollment(user.id, day.week.planId);
  if (!enrollment) return { ok: false, error: "Not enrolled." };

  const existing = await prisma.workoutSession.findUnique({
    where: {
      enrollmentId_workoutDayId: {
        enrollmentId: enrollment.id,
        workoutDayId: day.id,
      },
    },
    include: { setEntries: { where: { done: true }, take: 1 } },
  });
  if (existing?.setEntries.length)
    return { ok: false, error: "Already started — finish or reset it instead." };

  await prisma.workoutSession.upsert({
    where: {
      enrollmentId_workoutDayId: {
        enrollmentId: enrollment.id,
        workoutDayId: day.id,
      },
    },
    create: {
      enrollmentId: enrollment.id,
      workoutDayId: day.id,
      status: "skipped",
    },
    update: { status: "skipped" },
  });
  revalidatePath("/dashboard");
  revalidatePath("/timeline");
  revalidatePath("/plan");
  return { ok: true };
}

/** Undo a skip — deletes the empty skipped session so the day reopens. */
export async function unskipDayAction(
  workoutDayId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const day = await prisma.workoutDay.findUnique({
    where: { id: workoutDayId },
    include: { week: true },
  });
  if (!day) return { ok: false, error: "Workout not found." };
  const enrollment = await getActiveEnrollment(user.id, day.week.planId);
  if (!enrollment) return { ok: false, error: "Not enrolled." };

  await prisma.workoutSession.deleteMany({
    where: {
      enrollmentId: enrollment.id,
      workoutDayId: day.id,
      status: "skipped",
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/timeline");
  revalidatePath("/plan");
  return { ok: true };
}

/**
 * Push the whole schedule forward by the number of workouts behind — the
 * timeline re-anchors so today lines up with where the user actually is.
 * Computed server-side from the timeline; nothing is taken from the client.
 */
export async function pushScheduleAction(): Promise<{
  ok: boolean;
  error?: string;
  shiftedDays?: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { getProgress, buildTimeline } = await import("../metrics/progress");
  const p = await getProgress(user.id);
  if (!p || !p.enrolled || !p.startedAt)
    return { ok: false, error: "No started plan." };
  const t = buildTimeline(p);
  if (t.behind <= 0) return { ok: false, error: "You're not behind." };

  // Re-anchor so the FIRST open training day lands on today (exact, even with
  // rest days between the missed workouts).
  const firstOpen = t.days.find(
    (d) => !d.isRest && d.status !== "completed" && d.status !== "skipped"
  );
  if (!firstOpen) return { ok: false, error: "Nothing left to schedule." };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shiftDays = Math.round(
    (+today - +firstOpen.date) / 86_400_000
  );
  if (shiftDays <= 0) return { ok: false, error: "You're not behind." };

  const enrollment = await getActiveEnrollment(user.id);
  if (!enrollment) return { ok: false, error: "No active plan." };
  const shifted = new Date(p.startedAt);
  shifted.setDate(shifted.getDate() + shiftDays);
  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { startedAt: shifted },
  });
  revalidatePath("/dashboard");
  revalidatePath("/timeline");
  revalidatePath("/plan");
  return { ok: true, shiftedDays: shiftDays };
}
