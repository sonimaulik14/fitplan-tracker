"use client";

import { useEffect, useState } from "react";
import {
  OUTBOX_EVENT,
  getOutboxSummary,
  type OutboxSummary,
} from "./offline/outbox";

const EMPTY: OutboxSummary = {
  pendingCount: 0,
  oldestCapturedAt: null,
  authBlocked: false,
};

/** Live view of the offline outbox (updates via the vajra:outbox event). */
export function useOutboxStatus(): OutboxSummary {
  const [summary, setSummary] = useState<OutboxSummary>(EMPTY);

  useEffect(() => {
    let alive = true;
    getOutboxSummary()
      .then((s) => alive && setSummary(s))
      .catch(() => {});
    const onChange = (e: Event) =>
      setSummary((e as CustomEvent).detail as OutboxSummary);
    window.addEventListener(OUTBOX_EVENT, onChange);
    return () => {
      alive = false;
      window.removeEventListener(OUTBOX_EVENT, onChange);
    };
  }, []);

  return summary;
}
