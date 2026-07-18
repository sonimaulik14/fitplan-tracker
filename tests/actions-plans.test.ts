import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const prisma = vi.hoisted(() => ({
  plan: { create: vi.fn(), findUnique: vi.fn() },
  enrollment: { create: vi.fn() },
  workoutSession: { count: vi.fn() },
  week: { deleteMany: vi.fn() },
  exerciseSwap: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/metrics/enrollment", () => ({ getActiveEnrollment: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { savePlanAction, type PlanDraft } from "@/lib/actions/plans";
import { getCurrentUser } from "@/lib/auth";
import { getActiveEnrollment } from "@/lib/metrics/enrollment";

const auth = () =>
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1" } as never);

// Minimal valid draft: 1 week × 7 days, one exercise on day 1.
const draft = (): PlanDraft => ({
  name: "Test block",
  description: "",
  weeks: [
    {
      number: 1,
      style: null,
      days: Array.from({ length: 7 }, (_, i) => ({
        dayNumber: i + 1,
        label: i === 0 ? "Day 1" : "Rest",
        focus: i === 0 ? "Push" : "Rest",
        exercises:
          i === 0
            ? [
                {
                  name: "Barbell Bench Press",
                  muscle: "Chest",
                  groupLabel: null,
                  warmupSets: 1,
                  workingSets: 3,
                  repTarget: "8-12",
                  isCardio: false,
                },
              ]
            : [],
      })),
    },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.plan.create.mockResolvedValue({ id: "p-new" });
  prisma.enrollment.create.mockResolvedValue({ id: "e-new" });
});

describe("savePlanAction first-program auto-enroll", () => {
  it("enrolls the user when they have no active enrollment", async () => {
    auth();
    vi.mocked(getActiveEnrollment).mockResolvedValue(null as never);
    const res = await savePlanAction(draft());
    expect(res.ok).toBe(true);
    expect(res.enrolled).toBe(true);
    expect(prisma.enrollment.create).toHaveBeenCalledWith({
      data: { userId: "u1", planId: "p-new", cycle: 1 },
    });
  });

  it("never switches a user who already has an active enrollment", async () => {
    auth();
    vi.mocked(getActiveEnrollment).mockResolvedValue({ id: "e0" } as never);
    const res = await savePlanAction(draft());
    expect(res.ok).toBe(true);
    expect(res.enrolled).toBe(false);
    expect(prisma.enrollment.create).not.toHaveBeenCalled();
  });

  it("requires auth and rejects invalid drafts before any writes", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect((await savePlanAction(draft())).ok).toBe(false);

    auth();
    const bad = draft();
    bad.name = "x"; // too short
    expect((await savePlanAction(bad)).ok).toBe(false);
    expect(prisma.plan.create).not.toHaveBeenCalled();
  });
});
