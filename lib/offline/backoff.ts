// Retry backoff for outbox drains: 5s → 15s → 45s → … capped at 5 min, with
// ±20% jitter so parallel tabs don't retry in lockstep. Pure and unit-tested.

const BASE_MS = 5_000;
const CAP_MS = 300_000;

export function nextDelayMs(
  attempts: number,
  random: () => number = Math.random
): number {
  const raw = Math.min(BASE_MS * Math.pow(3, Math.max(0, attempts)), CAP_MS);
  const jitter = 1 + (random() * 2 - 1) * 0.2; // 0.8 … 1.2
  return Math.round(raw * jitter);
}

/** Whether an item with `attempts` failures made at `lastAttemptAt` is due. */
export function isDue(
  attempts: number,
  lastAttemptAt: number | null,
  now: number,
  random: () => number = Math.random
): boolean {
  if (lastAttemptAt == null) return true;
  return now >= lastAttemptAt + nextDelayMs(attempts, random);
}
