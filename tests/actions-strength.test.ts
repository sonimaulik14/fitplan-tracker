import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const prisma = vi.hoisted(() => ({
  liftTest: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { logLiftTestAction } from "@/lib/actions/strength";
import { getCurrentUser } from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.liftTest.create.mockResolvedValue({});
});

const auth = () =>
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1" } as never);

describe("logLiftTestAction", () => {
  it("requires auth", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect((await logLiftTestAction("squat", 100, 1)).ok).toBe(false);
    expect(prisma.liftTest.create).not.toHaveBeenCalled();
  });

  it("rejects unknown lifts and bad numbers", async () => {
    auth();
    expect((await logLiftTestAction("yoga", 100, 1)).ok).toBe(false);
    expect((await logLiftTestAction("squat", 0, 1)).ok).toBe(false);
    expect((await logLiftTestAction("squat", 800, 1)).ok).toBe(false);
    expect((await logLiftTestAction("squat", 100, 0)).ok).toBe(false);
    expect((await logLiftTestAction("squat", 100, 11)).ok).toBe(false);
    expect(prisma.liftTest.create).not.toHaveBeenCalled();
  });

  it("creates a row with rounded reps", async () => {
    auth();
    const res = await logLiftTestAction("bench", 102.5, 1.4);
    expect(res.ok).toBe(true);
    expect(prisma.liftTest.create).toHaveBeenCalledWith({
      data: { userId: "u1", liftKey: "bench", weightKg: 102.5, reps: 1 },
    });
  });
});
