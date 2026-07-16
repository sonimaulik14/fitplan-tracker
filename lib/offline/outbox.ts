// IndexedDB outbox for workout saves. Every save is persisted here FIRST,
// then attempted over the network; items are removed only on confirmed server
// success (or explicit user discard). Snapshots are full-day payloads keyed
// `workout:<dayId>` — a put() naturally coalesces repeated edits, so only the
// newest snapshot per day survives and a stale replay can never overwrite a
// newer local one.

import { idbPut, idbGet, idbGetAll, idbDelete } from "./idb";
import { isDue } from "./backoff";

// Structural copies of saveWorkoutAction's input (kept local so this
// client-safe module doesn't import server code).
export type OutboxSet = {
  planExerciseId: string;
  setNumber: number;
  setType: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  done: boolean;
};
export type OutboxMeta = {
  notes?: string;
  mood?: string;
  bodyweight?: number | null;
};
export type WorkoutSavePayload = {
  sets: OutboxSet[];
  status: "in_progress" | "completed";
  meta: OutboxMeta;
};

export type OutboxState = "pending" | "syncing" | "auth" | "failed";

export type OutboxItem = {
  id: string; // `workout:${dayId}` — the coalescing key
  kind: "workout-save";
  dayId: string;
  payload: WorkoutSavePayload;
  capturedAt: number; // first enqueue for this day (age tracking)
  updatedAt: number; // last local edit — drain ordering
  attempts: number;
  lastAttemptAt: number | null;
  lastError: string | null;
  state: OutboxState;
};

export type SaveResult = {
  ok: boolean;
  error?: string;
  code?: "auth" | "not_found" | "not_enrolled" | "conflict";
  weekCompleted?: boolean;
  weekNumber?: number;
  programComplete?: boolean;
};

export type OutboxSummary = {
  pendingCount: number;
  oldestCapturedAt: number | null;
  authBlocked: boolean;
};

export const OUTBOX_EVENT = "vajra:outbox";

const keyFor = (dayId: string) => `workout:${dayId}`;

export async function notifyOutboxChanged() {
  if (typeof window === "undefined") return;
  const summary = await getOutboxSummary().catch(
    (): OutboxSummary => ({
      pendingCount: 0,
      oldestCapturedAt: null,
      authBlocked: false,
    })
  );
  window.dispatchEvent(new CustomEvent(OUTBOX_EVENT, { detail: summary }));
}

export async function getOutboxSummary(): Promise<OutboxSummary> {
  const items = await idbGetAll<OutboxItem>();
  const live = items.filter((i) => i.state !== "failed");
  return {
    pendingCount: live.length,
    oldestCapturedAt: live.length
      ? Math.min(...live.map((i) => i.capturedAt))
      : null,
    authBlocked: items.some((i) => i.state === "auth"),
  };
}

export async function enqueueWorkoutSave(
  dayId: string,
  payload: WorkoutSavePayload
): Promise<void> {
  const now = Date.now();
  const existing = await idbGet<OutboxItem>(keyFor(dayId)).catch(
    () => undefined
  );
  const item: OutboxItem = {
    id: keyFor(dayId),
    kind: "workout-save",
    dayId,
    payload,
    capturedAt: existing?.capturedAt ?? now,
    updatedAt: now,
    // New local edits reset the retry clock and clear stale failure state.
    attempts: 0,
    lastAttemptAt: null,
    lastError: null,
    state: "pending",
  };
  await idbPut(item);
  void notifyOutboxChanged();
}

export const getWorkoutItem = (dayId: string) =>
  idbGet<OutboxItem>(keyFor(dayId));

export async function removeItem(id: string): Promise<void> {
  await idbDelete(id);
  void notifyOutboxChanged();
}

export const removeWorkoutItem = (dayId: string) => removeItem(keyFor(dayId));

export async function listItems(): Promise<OutboxItem[]> {
  return idbGetAll<OutboxItem>();
}

export type DrainResult = {
  synced: OutboxItem[];
  results: SaveResult[];
  haltedOnAuth: boolean;
};

type SaveFn = (
  dayId: string,
  payload: WorkoutSavePayload,
  capturedAt: number
) => Promise<SaveResult>;

let draining = false;

/**
 * Replay queued saves, oldest edit first. Single-flight per tab. `force`
 * ignores the backoff schedule (used for the `online` event and manual
 * retries). Halts on an auth failure — every subsequent item would fail the
 * same way; items are kept and flipped back to pending on the next drain so a
 * restored session self-heals.
 */
export async function drainOutbox(
  saveFn: SaveFn,
  opts: { force?: boolean; now?: () => number } = {}
): Promise<DrainResult> {
  const result: DrainResult = { synced: [], results: [], haltedOnAuth: false };
  if (draining) return result;
  draining = true;
  const now = opts.now ?? Date.now;
  try {
    const items = (await idbGetAll<OutboxItem>())
      .filter((i) => i.kind === "workout-save")
      .sort((a, b) => a.updatedAt - b.updatedAt);

    for (const item of items) {
      if (item.state === "failed") continue; // needs user action, not a timer
      if (
        !opts.force &&
        item.state !== "auth" && // auth items retry on every drain
        !isDue(item.attempts, item.lastAttemptAt, now())
      )
        continue;

      await idbPut({ ...item, state: "syncing" as const });
      void notifyOutboxChanged();

      let res: SaveResult;
      try {
        res = await saveFn(item.dayId, item.payload, item.updatedAt);
      } catch (err) {
        // Network/server unreachable — keep pending, back off.
        await idbPut({
          ...item,
          state: "pending" as const,
          attempts: item.attempts + 1,
          lastAttemptAt: now(),
          lastError: err instanceof Error ? err.message : String(err),
        });
        void notifyOutboxChanged();
        continue;
      }

      if (res.ok) {
        await idbDelete(item.id);
        result.synced.push(item);
        result.results.push(res);
      } else if (res.code === "auth") {
        await idbPut({
          ...item,
          state: "auth" as const,
          lastAttemptAt: now(),
          lastError: res.error ?? "auth",
        });
        result.haltedOnAuth = true;
        void notifyOutboxChanged();
        break;
      } else if (res.code === "conflict") {
        // Newer data exists on the server (another device) — this snapshot
        // must not clobber it. Drop it; the caller surfaces a toast.
        await idbDelete(item.id);
        result.results.push(res);
      } else {
        // Permanent rejection (validation, missing day/enrollment): keep the
        // row for a user-facing discard affordance, stop auto-retrying.
        await idbPut({
          ...item,
          state: "failed" as const,
          lastAttemptAt: now(),
          lastError: res.error ?? "rejected",
        });
        result.results.push(res);
      }
      void notifyOutboxChanged();
    }
  } finally {
    draining = false;
  }
  void notifyOutboxChanged();
  return result;
}
