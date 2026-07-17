import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const prisma = vi.hoisted(() => ({
  dailyLog: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  saveReadinessAction,
  startLightWeekAction,
  endLightWeekAction,
} from "@/lib/actions/readiness";
import { getCurrentUser } from "@/lib/auth";

const mockUser = (timezone: string | null = null) =>
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "u1",
    timezone,
  } as never);

beforeEach(() => {
  vi.clearAllMocks();
  prisma.dailyLog.upsert.mockResolvedValue({});
});
afterEach(() => {
  vi.useRealTimers();
});

describe("saveReadinessAction", () => {
  it("rejects unauthenticated users without touching the DB", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    const res = await saveReadinessAction({ sleepQuality: 3 });
    expect(res.ok).toBe(false);
    expect(prisma.dailyLog.upsert).not.toHaveBeenCalled();
  });

  it("rejects an empty payload", async () => {
    mockUser();
    const res = await saveReadinessAction({});
    expect(res.ok).toBe(false);
    expect(prisma.dailyLog.upsert).not.toHaveBeenCalled();
  });

  it("clamps values into 1-5 and rounds", async () => {
    mockUser();
    await saveReadinessAction({ sleepQuality: 7, soreness: 0, energy: 3.6 });
    const args = prisma.dailyLog.upsert.mock.calls[0][0];
    expect(args.update).toEqual({ sleepQuality: 5, soreness: 1, energy: 4 });
  });

  it("passes null through to clear an answer", async () => {
    mockUser();
    await saveReadinessAction({ energy: null });
    const args = prisma.dailyLog.upsert.mock.calls[0][0];
    expect(args.update).toEqual({ energy: null });
  });

  it("partial input only touches the provided field (no clobber)", async () => {
    mockUser();
    await saveReadinessAction({ soreness: 4 });
    const args = prisma.dailyLog.upsert.mock.calls[0][0];
    expect(Object.keys(args.update)).toEqual(["soreness"]);
    expect(args.create).toEqual({ userId: "u1", day: expect.any(String), soreness: 4 });
  });

  it("keys the row by the user's timezone-local day", async () => {
    vi.useFakeTimers();
    // 22:30 UTC = next calendar day in Kolkata (+5:30)
    vi.setSystemTime(new Date("2026-07-17T22:30:00Z"));
    mockUser("Asia/Kolkata");
    await saveReadinessAction({ energy: 2 });
    const args = prisma.dailyLog.upsert.mock.calls[0][0];
    expect(args.where.userId_day.day).toBe("2026-07-18");
  });
});

describe("light week actions", () => {
  it("start sets lightWeekUntil ~7 days out", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T12:00:00Z"));
    mockUser();
    prisma.user.update.mockResolvedValue({});
    const res = await startLightWeekAction();
    expect(res.ok).toBe(true);
    const until = prisma.user.update.mock.calls[0][0].data.lightWeekUntil as Date;
    expect(until.toISOString().slice(0, 10)).toBe("2026-07-24");
    expect(res.until).toBe(until.toISOString());
  });

  it("end clears lightWeekUntil", async () => {
    mockUser();
    prisma.user.update.mockResolvedValue({});
    const res = await endLightWeekAction();
    expect(res.ok).toBe(true);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ lightWeekUntil: null });
  });

  it("both actions require auth", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect((await startLightWeekAction()).ok).toBe(false);
    expect((await endLightWeekAction()).ok).toBe(false);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
