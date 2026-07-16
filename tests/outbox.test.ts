import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// In-memory stand-in for the IndexedDB wrapper (node has no indexedDB).
const store = vi.hoisted(() => new Map<string, Record<string, unknown>>());

vi.mock("@/lib/offline/idb", () => ({
  idbPut: vi.fn(async (value: { id: string }) => {
    store.set(value.id, structuredClone(value));
    return value.id;
  }),
  idbGet: vi.fn(async (key: string) => {
    const v = store.get(key);
    return v ? structuredClone(v) : undefined;
  }),
  idbGetAll: vi.fn(async () => [...store.values()].map((v) => structuredClone(v))),
  idbDelete: vi.fn(async (key: string) => {
    store.delete(key);
  }),
}));

import {
  enqueueWorkoutSave,
  drainOutbox,
  type OutboxItem,
  type SaveResult,
  type WorkoutSavePayload,
} from "@/lib/offline/outbox";

const payload = (marker: string): WorkoutSavePayload => ({
  sets: [
    {
      planExerciseId: marker,
      setNumber: 1,
      setType: "work",
      weight: 100,
      reps: 5,
      rpe: 8,
      done: true,
    },
  ],
  status: "completed",
  meta: { notes: marker },
});

const seedItem = (overrides: Partial<OutboxItem>): OutboxItem => {
  const item: OutboxItem = {
    id: `workout:${overrides.dayId ?? "d1"}`,
    kind: "workout-save",
    dayId: "d1",
    payload: payload("seed"),
    capturedAt: 1_000,
    updatedAt: 1_000,
    attempts: 0,
    lastAttemptAt: null,
    lastError: null,
    state: "pending",
    ...overrides,
  };
  store.set(item.id, structuredClone(item) as unknown as Record<string, unknown>);
  return item;
};

const getStored = (dayId: string) =>
  store.get(`workout:${dayId}`) as unknown as OutboxItem | undefined;

const ok = async (): Promise<SaveResult> => ({ ok: true });

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("enqueueWorkoutSave", () => {
  it("coalesces repeated saves for one day into a single item keeping the latest payload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    await enqueueWorkoutSave("d1", payload("first"));

    // Simulate accumulated failure state on the queued item.
    const stale = getStored("d1")!;
    store.set(stale.id, {
      ...stale,
      attempts: 3,
      lastAttemptAt: 1_500,
      lastError: "boom",
      state: "failed",
    } as unknown as Record<string, unknown>);

    vi.setSystemTime(2_000);
    await enqueueWorkoutSave("d1", payload("second"));

    expect(store.size).toBe(1);
    const item = getStored("d1")!;
    expect(item.payload.meta.notes).toBe("second"); // latest payload wins
    expect(item.capturedAt).toBe(1_000); // original capture time preserved
    expect(item.updatedAt).toBe(2_000);
    // A fresh local edit resets the retry clock and clears failure state.
    expect(item.attempts).toBe(0);
    expect(item.lastAttemptAt).toBeNull();
    expect(item.lastError).toBeNull();
    expect(item.state).toBe("pending");
  });
});

describe("drainOutbox ordering", () => {
  it("replays items oldest edit first (updatedAt ascending)", async () => {
    seedItem({ dayId: "d2", id: "workout:d2", updatedAt: 1_000 });
    seedItem({ dayId: "d1", id: "workout:d1", updatedAt: 2_000 });

    const order: string[] = [];
    const saveFn = vi.fn(async (dayId: string) => {
      order.push(dayId);
      return { ok: true };
    });

    const res = await drainOutbox(saveFn, { force: true });
    expect(order).toEqual(["d2", "d1"]);
    expect(res.synced.map((i) => i.dayId)).toEqual(["d2", "d1"]);
    expect(store.size).toBe(0);
  });
});

describe("drainOutbox result classification", () => {
  it("keeps the item pending with attempts+1 when saveFn throws (network failure)", async () => {
    seedItem({ dayId: "d1" });
    const saveFn = vi.fn(async () => {
      throw new Error("offline");
    });

    const res = await drainOutbox(saveFn, { force: true, now: () => 9_000 });

    expect(res.synced).toHaveLength(0);
    expect(res.results).toHaveLength(0);
    const item = getStored("d1")!;
    expect(item.state).toBe("pending");
    expect(item.attempts).toBe(1);
    expect(item.lastAttemptAt).toBe(9_000);
    expect(item.lastError).toBe("offline");
  });

  it("marks the item auth and HALTS the drain on an auth rejection", async () => {
    seedItem({ dayId: "d1", id: "workout:d1", updatedAt: 1_000 });
    seedItem({ dayId: "d2", id: "workout:d2", updatedAt: 2_000 });
    const saveFn = vi.fn(async (): Promise<SaveResult> => ({ ok: false, code: "auth" }));

    const res = await drainOutbox(saveFn, { force: true, now: () => 9_000 });

    expect(saveFn).toHaveBeenCalledTimes(1); // second item never attempted
    expect(saveFn).toHaveBeenCalledWith("d1", expect.anything(), 1_000);
    expect(res.haltedOnAuth).toBe(true);
    expect(getStored("d1")!.state).toBe("auth");
    expect(getStored("d2")!.state).toBe("pending"); // untouched
  });

  it("marks the item failed on not_found and never auto-retries it", async () => {
    seedItem({ dayId: "d1" });
    const saveFn = vi.fn(
      async (): Promise<SaveResult> => ({ ok: false, code: "not_found", error: "Workout not found." })
    );

    const res = await drainOutbox(saveFn, { force: true });
    expect(res.results).toEqual([{ ok: false, code: "not_found", error: "Workout not found." }]);
    expect(getStored("d1")!.state).toBe("failed");
    expect(getStored("d1")!.lastError).toBe("Workout not found.");

    // Failed items are skipped on subsequent drains, even forced ones.
    const retry = vi.fn(ok);
    await drainOutbox(retry, { force: true });
    expect(retry).not.toHaveBeenCalled();
    expect(getStored("d1")).toBeDefined(); // kept for user-facing discard
  });

  it("DELETES the item on conflict (newer server data) and records the result", async () => {
    seedItem({ dayId: "d1" });
    const saveFn = vi.fn(async (): Promise<SaveResult> => ({ ok: false, code: "conflict" }));

    const res = await drainOutbox(saveFn, { force: true });
    expect(getStored("d1")).toBeUndefined();
    expect(res.results).toEqual([{ ok: false, code: "conflict" }]);
    expect(res.synced).toHaveLength(0);
  });

  it("removes the item and reports it in synced on success", async () => {
    const seeded = seedItem({ dayId: "d1" });
    const saveFn = vi.fn(
      async (): Promise<SaveResult> => ({ ok: true, weekCompleted: true, weekNumber: 2 })
    );

    const res = await drainOutbox(saveFn, { force: true });
    expect(getStored("d1")).toBeUndefined();
    expect(res.synced.map((i) => i.id)).toEqual([seeded.id]);
    expect(res.results).toEqual([{ ok: true, weekCompleted: true, weekNumber: 2 }]);
  });
});

describe("drainOutbox single-flight", () => {
  it("a second concurrent drain returns empty without attempting any item", async () => {
    seedItem({ dayId: "d1" });

    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const saveFn = vi.fn(async (): Promise<SaveResult> => {
      await gate;
      return { ok: true };
    });

    const first = drainOutbox(saveFn, { force: true });
    const second = await drainOutbox(saveFn, { force: true }); // while first is in flight
    expect(second).toEqual({ synced: [], results: [], haltedOnAuth: false });

    release();
    const firstRes = await first;
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(firstRes.synced).toHaveLength(1);
  });
});

describe("drainOutbox backoff scheduling", () => {
  it("skips an item still inside its backoff window unless forced", async () => {
    // attempts 2 → 45s ± 20% delay (36s minimum); only 10s have elapsed.
    seedItem({ dayId: "d1", attempts: 2, lastAttemptAt: 100_000 });
    const saveFn = vi.fn(ok);

    const skipped = await drainOutbox(saveFn, { now: () => 110_000 });
    expect(saveFn).not.toHaveBeenCalled();
    expect(skipped.synced).toHaveLength(0);
    expect(getStored("d1")!.state).toBe("pending");

    const forced = await drainOutbox(saveFn, { force: true, now: () => 110_000 });
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(forced.synced).toHaveLength(1);
  });

  it("retries auth-blocked items on every drain, ignoring the backoff schedule", async () => {
    seedItem({ dayId: "d1", state: "auth", attempts: 5, lastAttemptAt: 100_000 });
    const saveFn = vi.fn(ok);

    // 1ms after the last attempt, no force — auth items bypass isDue.
    const res = await drainOutbox(saveFn, { now: () => 100_001 });
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(res.synced).toHaveLength(1);
    expect(getStored("d1")).toBeUndefined();
  });
});
