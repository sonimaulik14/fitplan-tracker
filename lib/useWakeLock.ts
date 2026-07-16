"use client";

import { useEffect, useRef, useState } from "react";

// Keep the screen awake while a workout is in progress — a phone that sleeps
// mid-set forces an unlock between every exercise. Supported natively on
// Chrome 84+ and iOS/Safari 16.4+ (including home-screen PWAs); older engines
// simply degrade (no silent-video fallback — it fights autoplay policies and
// burns battery for a shrinking sliver of devices). The OS can still revoke
// the lock (low battery / energy saver), which is the right escape hatch.

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener: (type: "release", cb: () => void) => void;
};

export function useWakeLock(active: boolean): {
  supported: boolean;
  engaged: boolean;
} {
  const [engaged, setEngaged] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const supported =
    typeof navigator !== "undefined" && "wakeLock" in navigator;

  useEffect(() => {
    if (!supported || !active) return;

    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const sentinel = await (
          navigator as Navigator & {
            wakeLock: { request: (t: "screen") => Promise<WakeLockSentinelLike> };
          }
        ).wakeLock.request("screen");
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        setEngaged(true);
        sentinel.addEventListener("release", () => setEngaged(false));
      } catch {
        // Rejected (energy saver, permissions) — degrade silently.
        setEngaged(false);
      }
    };

    // The UA auto-releases when the page hides; re-acquire on return.
    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
      setEngaged(false);
    };
  }, [active, supported]);

  return { supported, engaged };
}
