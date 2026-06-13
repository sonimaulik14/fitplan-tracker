"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { prisma } from "./prisma";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getCurrentUser,
  revokeSessions,
} from "./auth";
import { rateLimit } from "./rate-limit";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// Only accept raster image data URLs. Rejects SVG (which can carry inline
// script) and anything that isn't a base64 PNG/JPEG/WebP/GIF.
const isSafeImageDataUrl = (s: string) =>
  /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s);

export type AuthState = { error?: string; ok?: boolean } | undefined;

export async function signupAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!(await rateLimit("signup", 5, 60_000)))
    return { error: "Too many attempts. Please wait a minute and try again." };
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password)
    return { error: "All fields are required." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists." };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  await createSession(user.id);
  redirect("/onboarding");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!(await rateLimit("login", 8, 60_000)))
    return { error: "Too many attempts. Please wait a minute and try again." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are required." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return { error: "Invalid email or password." };

  const remember = formData.get("remember") != null;
  await createSession(user.id, remember);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

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
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, planId: day.week.planId },
  });
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
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, status: "active" },
    orderBy: { startDate: "desc" },
  });
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

export async function changePasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { error: "Not signed in." };
  // Throttle online guessing of the current password.
  if (!(await rateLimit("change-password", 8, 60_000)))
    return { error: "Too many attempts — try again in a minute." };
  if (next.length < 8)
    return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true },
  });
  if (!user || !(await verifyPassword(current, user.passwordHash)))
    return { error: "Current password is incorrect." };

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash: await hashPassword(next) },
  });
  // Invalidate sessions on other devices, then re-issue one for this device so
  // the user stays signed in here.
  await revokeSessions(sessionUser.id);
  await createSession(sessionUser.id);
  return { ok: true };
}

// Request a reset link. Returns a generic message; in this build (no email
// provider) it also returns the link so the flow is fully usable + email-ready.
export async function requestPasswordResetAction(
  _prev: { sent?: boolean; link?: string } | undefined,
  formData: FormData
): Promise<{ sent?: boolean; link?: string }> {
  // Throttle to curb reset-spam and email enumeration. Always report "sent".
  if (!(await rateLimit("reset", 5, 15 * 60_000))) return { sent: true };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;

  if (user) {
    const raw = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
    const link = `/reset/${raw}`;
    // SECURITY: never hand a reset token to the client in production — anyone who
    // knows a registered email could request it and take over the account. Until
    // an email provider is wired up, log it server-side (owner can read it from
    // Vercel logs) and expose it directly only in development.
    if (process.env.NODE_ENV === "production") {
      console.log(`[password-reset] ${email} -> ${link}`);
      return { sent: true };
    }
    return { sent: true, link };
  }
  return { sent: true };
}

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  // Throttle token-guessing attempts (tokens are 256-bit, but defense in depth).
  if (!(await rateLimit("reset-confirm", 10, 15 * 60_000)))
    return { error: "Too many attempts — try again later." };
  const token = String(formData.get("token") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (next !== confirm) return { error: "Passwords don't match." };

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!row || row.expiresAt < new Date())
    return { error: "This reset link is invalid or has expired." };

  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: await hashPassword(next) },
  });
  await prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } });
  // Invalidate any sessions issued before the reset, then sign in fresh.
  await revokeSessions(row.userId);
  await createSession(row.userId);
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
  await prisma.enrollment.upsert({
    where: { userId_planId: { userId: user.id, planId: plan.id } },
    update: { status: "active" },
    create: { userId: user.id, planId: plan.id },
  });

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

export async function saveWorkoutAction(
  workoutDayId: string,
  sets: IncomingSet[],
  status: "in_progress" | "completed",
  meta: WorkoutMeta = {}
): Promise<{
  ok: boolean;
  error?: string;
  weekCompleted?: boolean;
  weekNumber?: number;
  programComplete?: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const day = await prisma.workoutDay.findUnique({
    where: { id: workoutDayId },
    include: { week: true, exercises: { select: { id: true } } },
  });
  if (!day) return { ok: false, error: "Workout not found." };

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, planId: day.week.planId },
  });
  if (!enrollment) return { ok: false, error: "You haven't started this plan." };

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
    const kg =
      input.unit === "lb" ? input.bodyweight / 2.2046226218 : input.bodyweight;
    await prisma.bodyMetric.create({
      data: { userId: user.id, weightKg: kg },
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
    data: { avatarUrl: dataUrl },
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
      ...(input.timezone && input.timezone.length < 64
        ? { timezone: input.timezone }
        : {}),
    },
  });
  revalidatePath("/account");
  revalidatePath("/dashboard");
  return { ok: true };
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

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, planId: ex.workoutDay.week.planId },
  });
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

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

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
      day: todayStr(),
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
  const day = todayStr();
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

export async function toggleSupplementAction(name: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const day = todayStr();
  const existing = await prisma.dailyLog.findUnique({
    where: { userId_day: { userId: user.id, day } },
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
  await prisma.dailyLog.upsert({
    where: { userId_day: { userId: user.id, day } },
    create: { userId: user.id, day, supplementsTaken: csv },
    update: { supplementsTaken: csv },
  });
  revalidatePath("/nutrition");
  return { ok: true };
}

export async function setNutritionGoalsAction(input: {
  calorieGoal: number | null;
  proteinGoal: number | null;
  supplements: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const clampInt = (v: number | null, max: number) =>
    v == null || Number.isNaN(v) || v <= 0 ? null : Math.min(Math.round(v), max);
  const supplements =
    input.supplements
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20)
      .join(",") || null;
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

export async function addProgressPhotoAction(dataUrl: string, note?: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!isSafeImageDataUrl(dataUrl))
    return { ok: false, error: "Invalid image." };
  if (dataUrl.length > 3_500_000)
    return { ok: false, error: "Image too large — try a smaller photo." };
  await prisma.progressPhoto.create({
    data: { userId: user.id, dataUrl, note: note || null },
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
