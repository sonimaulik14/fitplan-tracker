import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const prisma = vi.hoisted(() => {
  const model = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  });
  const p = {
    user: model(),
    plan: model(),
    enrollment: model(),
    workoutDay: model(),
    workoutSession: model(),
    setEntry: model(),
    exerciseSwap: model(),
    $transaction: vi.fn(),
  };
  return p;
});

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/metrics/enrollment", () => ({ getActiveEnrollment: vi.fn() }));
vi.mock("@/lib/metrics/progress", () => ({ isProgramComplete: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error("REDIRECT:" + url);
  }),
}));

import { saveWorkoutAction, startNextCycleAction } from "@/lib/actions/workout";
import { getCurrentUser } from "@/lib/auth";
import { getActiveEnrollment } from "@/lib/metrics/enrollment";
import { isProgramComplete } from "@/lib/metrics/progress";

const user = { id: "u1" };
const day = {
  id: "day1",
  weekId: "w1",
  week: { id: "w1", planId: "p1", number: 3 },
  exercises: [{ id: "ex1" }, { id: "ex2" }],
};

const baseSet = {
  setNumber: 1,
  setType: "work",
  weight: 100,
  reps: 5,
  rpe: 8,
  done: true,
};

beforeEach(() => {
  vi.resetAllMocks();
  // $transaction executes the callback against the same mocked client.
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
    fn(prisma)
  );
});

function mockHappyPath() {
  vi.mocked(getCurrentUser).mockResolvedValue(user as never);
  prisma.workoutDay.findUnique.mockResolvedValue(day);
  vi.mocked(getActiveEnrollment).mockResolvedValue({ id: "e1" } as never);
  prisma.workoutSession.findUnique.mockResolvedValue(null);
  prisma.workoutSession.upsert.mockResolvedValue({ id: "s1" });
  prisma.setEntry.deleteMany.mockResolvedValue({ count: 0 });
  prisma.setEntry.createMany.mockResolvedValue({ count: 1 });
}

describe("saveWorkoutAction — guards", () => {
  it("returns code 'auth' when not signed in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    const res = await saveWorkoutAction("day1", [], "in_progress");
    expect(res).toEqual({ ok: false, error: "Not signed in.", code: "auth" });
    expect(prisma.workoutDay.findUnique).not.toHaveBeenCalled();
  });

  it("returns code 'not_found' when the day doesn't exist", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user as never);
    prisma.workoutDay.findUnique.mockResolvedValue(null);
    const res = await saveWorkoutAction("nope", [], "in_progress");
    expect(res.ok).toBe(false);
    expect(res.code).toBe("not_found");
  });

  it("returns code 'not_enrolled' without an active enrollment", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user as never);
    prisma.workoutDay.findUnique.mockResolvedValue(day);
    vi.mocked(getActiveEnrollment).mockResolvedValue(null as never);
    const res = await saveWorkoutAction("day1", [], "in_progress");
    expect(res.ok).toBe(false);
    expect(res.code).toBe("not_enrolled");
    expect(vi.mocked(getActiveEnrollment)).toHaveBeenCalledWith("u1", "p1");
  });
});

describe("saveWorkoutAction — input sanitization", () => {
  it("drops sets for exercises not on the day and clamps weight/reps/rpe", async () => {
    mockHappyPath();

    const res = await saveWorkoutAction(
      "day1",
      [
        { ...baseSet, planExerciseId: "ex1", weight: 99_999, reps: 5_000, rpe: 15 },
        { ...baseSet, planExerciseId: "intruder", setNumber: 2 }, // not on this day
        {
          ...baseSet,
          planExerciseId: "ex2",
          setNumber: 0,
          setType: "bogus",
          weight: -50,
          reps: null,
          rpe: 8.5,
          done: false,
        },
      ],
      "in_progress"
    );

    expect(res).toEqual({
      ok: true,
      weekCompleted: false,
      weekNumber: 3,
      programComplete: false,
    });

    expect(prisma.setEntry.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: "s1" },
    });
    expect(prisma.setEntry.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.setEntry.createMany).toHaveBeenCalledWith({
      data: [
        {
          sessionId: "s1",
          planExerciseId: "ex1",
          setNumber: 1,
          setType: "work",
          weight: 2000, // clamped
          reps: 1000, // clamped
          rpe: 10, // clamped
          done: true,
        },
        {
          sessionId: "s1",
          planExerciseId: "ex2",
          setNumber: 1, // floored to the 1..100 range
          setType: "work", // anything but "warmup" normalizes to "work"
          weight: 0, // negative clamped up to 0
          reps: null, // null passes through
          rpe: 8.5, // in range, untouched
          done: false,
        },
      ],
    });
  });

  it("skips createMany entirely when every set is dropped", async () => {
    mockHappyPath();
    const res = await saveWorkoutAction(
      "day1",
      [{ ...baseSet, planExerciseId: "someone-elses-exercise" }],
      "in_progress"
    );
    expect(res.ok).toBe(true);
    expect(prisma.setEntry.deleteMany).toHaveBeenCalled(); // still clears old sets
    expect(prisma.setEntry.createMany).not.toHaveBeenCalled();
  });
});

describe("saveWorkoutAction — offline-replay conflict guard", () => {
  it("rejects with code 'conflict' and writes NOTHING when capturedAt is older than the server session", async () => {
    mockHappyPath();
    prisma.workoutSession.findUnique.mockResolvedValue({
      performedDate: new Date(2_000),
    });

    const res = await saveWorkoutAction(
      "day1",
      [{ ...baseSet, planExerciseId: "ex1" }],
      "completed",
      {},
      1_000 // older than performedDate
    );

    expect(res.ok).toBe(false);
    expect(res.code).toBe("conflict");
    expect(prisma.workoutSession.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.setEntry.deleteMany).not.toHaveBeenCalled();
    expect(prisma.setEntry.createMany).not.toHaveBeenCalled();
  });

  it("proceeds when capturedAt is newer than the server session", async () => {
    mockHappyPath();
    prisma.workoutSession.findUnique.mockResolvedValue({
      performedDate: new Date(2_000),
    });

    const res = await saveWorkoutAction(
      "day1",
      [{ ...baseSet, planExerciseId: "ex1" }],
      "in_progress",
      {},
      5_000
    );

    expect(res.ok).toBe(true);
    expect(prisma.workoutSession.findUnique).toHaveBeenCalledWith({
      where: {
        enrollmentId_workoutDayId: { enrollmentId: "e1", workoutDayId: "day1" },
      },
      select: { performedDate: true },
    });
    expect(prisma.workoutSession.upsert).toHaveBeenCalledTimes(1);
  });

  it("skips the conflict lookup entirely for live saves (no capturedAt)", async () => {
    mockHappyPath();
    const res = await saveWorkoutAction(
      "day1",
      [{ ...baseSet, planExerciseId: "ex1" }],
      "in_progress"
    );
    expect(res.ok).toBe(true);
    expect(prisma.workoutSession.findUnique).not.toHaveBeenCalled();
  });
});

describe("startNextCycleAction", () => {
  const enrollment = {
    id: "e1",
    userId: "u1",
    planId: "p1",
    cycle: 1,
    status: "active",
    startedAt: new Date("2026-01-01T12:00:00Z"),
  };

  it("archives the finished run and creates cycle+1 with startedAt null, copying swaps", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user as never);
    vi.mocked(getActiveEnrollment).mockResolvedValue(enrollment as never);
    vi.mocked(isProgramComplete).mockResolvedValue(true as never);
    prisma.exerciseSwap.findMany.mockResolvedValue([
      { planExerciseId: "pe1", name: "DB Bench" },
      { planExerciseId: "pe2", name: "Trap-bar Deadlift" },
    ]);
    prisma.enrollment.update.mockResolvedValue({});
    prisma.enrollment.create.mockResolvedValue({ id: "e2", cycle: 2 });
    prisma.exerciseSwap.createMany.mockResolvedValue({ count: 2 });

    const res = await startNextCycleAction();

    expect(res).toEqual({ ok: true, cycle: 2 });
    expect(prisma.enrollment.update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { status: "completed" },
    });
    expect(prisma.enrollment.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        planId: "p1",
        cycle: 2,
        status: "active",
        startedAt: null,
      },
    });
    expect(prisma.exerciseSwap.createMany).toHaveBeenCalledWith({
      data: [
        { planExerciseId: "pe1", name: "DB Bench", enrollmentId: "e2" },
        { planExerciseId: "pe2", name: "Trap-bar Deadlift", enrollmentId: "e2" },
      ],
    });
  });

  it("skips the swap copy when there are no swaps", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user as never);
    vi.mocked(getActiveEnrollment).mockResolvedValue(enrollment as never);
    vi.mocked(isProgramComplete).mockResolvedValue(true as never);
    prisma.exerciseSwap.findMany.mockResolvedValue([]);
    prisma.enrollment.update.mockResolvedValue({});
    prisma.enrollment.create.mockResolvedValue({ id: "e2", cycle: 2 });

    const res = await startNextCycleAction();
    expect(res).toEqual({ ok: true, cycle: 2 });
    expect(prisma.exerciseSwap.createMany).not.toHaveBeenCalled();
  });

  it("refuses while the program is incomplete and the scheduled weeks haven't elapsed", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user as never);
    vi.mocked(getActiveEnrollment).mockResolvedValue({
      ...enrollment,
      startedAt: new Date(Date.now() - 7 * 86_400_000), // started a week ago
    } as never);
    vi.mocked(isProgramComplete).mockResolvedValue(false as never);
    prisma.plan.findUnique.mockResolvedValue({ totalWeeks: 12 });

    const res = await startNextCycleAction();
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/isn't finished/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.enrollment.create).not.toHaveBeenCalled();
  });

  it("refuses when incomplete and never started (no startedAt to age out)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user as never);
    vi.mocked(getActiveEnrollment).mockResolvedValue({
      ...enrollment,
      startedAt: null,
    } as never);
    vi.mocked(isProgramComplete).mockResolvedValue(false as never);

    const res = await startNextCycleAction();
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/isn't finished/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("allows a restart when incomplete but the scheduled window has fully elapsed", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user as never);
    vi.mocked(getActiveEnrollment).mockResolvedValue({
      ...enrollment,
      startedAt: new Date(Date.now() - 13 * 7 * 86_400_000), // 13 weeks ago
    } as never);
    vi.mocked(isProgramComplete).mockResolvedValue(false as never);
    prisma.plan.findUnique.mockResolvedValue({ totalWeeks: 12 });
    prisma.exerciseSwap.findMany.mockResolvedValue([]);
    prisma.enrollment.update.mockResolvedValue({});
    prisma.enrollment.create.mockResolvedValue({ id: "e2", cycle: 2 });

    const res = await startNextCycleAction();
    expect(res).toEqual({ ok: true, cycle: 2 });
  });

  it("returns an error when not signed in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    const res = await startNextCycleAction();
    expect(res).toEqual({ ok: false, error: "Not signed in." });
  });
});
