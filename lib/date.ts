// Shared date helpers (single source of truth — previously duplicated across
// metrics.ts and actions.ts).

/** Local calendar date as "YYYY-MM-DD". */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Today as "YYYY-MM-DD" (local). */
export function todayKey(): string {
  return ymd(new Date());
}

/** A copy of `d` at local midnight (00:00:00.000). */
export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** `d` plus `n` calendar days (steps by date so DST can't drop a day). */
export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Whole calendar days from `a` to `b` (b − a), ignoring time of day. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((+startOfDay(b) - +startOfDay(a)) / 86_400_000);
}

/**
 * Current streak = consecutive calendar days (ending today, or yesterday so an
 * unlogged "today" doesn't break it) present in `activeDates` ("YYYY-MM-DD").
 * Steps by calendar day so DST transitions can't silently drop a day. `today`
 * is injectable for testing.
 */
export function streakLength(
  activeDates: Set<string>,
  today: Date = new Date()
): number {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  if (!activeDates.has(ymd(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (activeDates.has(ymd(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
