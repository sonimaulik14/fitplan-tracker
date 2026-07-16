"use client";

import { useEffect, useRef } from "react";
import { saveWorkoutAction } from "@/lib/actions";
import {
  drainOutbox,
  type WorkoutSavePayload,
  type SaveResult,
} from "@/lib/offline/outbox";
import { toast } from "@/lib/toast";

// Global outbox drainer, mounted once in the root layout so queued workout
// saves sync even if the user reopens the app on a different page. Replays go
// through the imported server action — never a raw captured POST, since
// server-action IDs are build-specific.
//
// Triggers: app start, the `online` event, visibilitychange→visible (the
// reliable signal on iOS PWAs, where `online` is flaky), and a slow poll that
// only runs while the tab is visible. Foreground saves in WorkoutLogger also
// drain after each success.

const saveFn = (
  dayId: string,
  payload: WorkoutSavePayload,
  capturedAt: number
): Promise<SaveResult> =>
  saveWorkoutAction(dayId, payload.sets, payload.status, payload.meta, capturedAt);

export default function OfflineSync() {
  const authToastShown = useRef(false);

  useEffect(() => {
    let disposed = false;

    const drain = async (force: boolean) => {
      if (disposed) return;
      try {
        const res = await drainOutbox(saveFn, { force });
        if (disposed) return;
        for (const r of res.results) {
          if (r.ok && r.weekCompleted)
            toast(`Week ${r.weekNumber} complete — synced!`);
          if (r.code === "conflict")
            toast("A queued workout was skipped — it was updated on another device.", "error");
        }
        if (res.synced.length && !res.results.some((r) => r.weekCompleted))
          toast(
            `Synced ${res.synced.length} offline workout${res.synced.length === 1 ? "" : "s"} ✓`
          );
        if (res.haltedOnAuth && !authToastShown.current) {
          authToastShown.current = true;
          toast("Session expired — sign in to sync your queued workouts.", "error");
        }
        if (!res.haltedOnAuth) authToastShown.current = false;
      } catch {
        // IDB unavailable or similar — nothing to do.
      }
    };

    // App start (small delay so hydration wins the main thread first).
    const startTimer = setTimeout(() => drain(true), 2000);

    const onOnline = () => drain(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") drain(false);
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    // Slow safety-net poll, visible tab only.
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") drain(false);
    }, 30_000);

    return () => {
      disposed = true;
      clearTimeout(startTimer);
      clearInterval(poll);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
