// Pure reminder-gating logic for the daily push cron (no Prisma, no next
// imports) — extracted from app/api/cron/reminders/route.ts so it can be
// tested in isolation. The route keeps all DB reads/writes and push sends.

const WEEKDAY: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

// Local weekday (0-6), "HH:MM", and "YYYY-MM-DD" for an IANA timezone.
function localNow(tz: string, now: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  let hour = p.hour;
  if (hour === "24") hour = "00"; // some engines emit 24 at midnight
  return {
    weekday: WEEKDAY[p.weekday] ?? 0,
    hm: `${hour}:${p.minute}`,
    date: `${p.year}-${p.month}-${p.day}`,
  };
}

export type ReminderUser = {
  timezone: string | null;
  reminderTime: string;
  trainingDays: string | null;
  lastNotifiedDay: string | null;
};

export type ReminderDecision = {
  kind: "due" | "skip-already-notified" | "skip-before-time" | "skip-not-training-day";
  localDate: string;
};

/**
 * Should this user get today's reminder? Evaluated in the user's local
 * timezone (invalid/missing timezone falls back to UTC).
 *
 * - "skip-already-notified": lastNotifiedDay already covers today — nothing to do.
 * - "skip-before-time": their reminder time hasn't arrived yet — try again later.
 * - "skip-not-training-day": today isn't one of their training days; the route
 *   still marks lastNotifiedDay so the user isn't re-evaluated today.
 * - "due": time has passed on a training day (no days set = every day counts).
 */
export function reminderDecision(user: ReminderUser, now: Date = new Date()): ReminderDecision {
  const tz = user.timezone || "UTC";
  let local;
  try {
    local = localNow(tz, now);
  } catch {
    local = localNow("UTC", now);
  }

  if (user.lastNotifiedDay === local.date)
    return { kind: "skip-already-notified", localDate: local.date }; // already handled today
  if (local.hm < (user.reminderTime || "18:00"))
    return { kind: "skip-before-time", localDate: local.date }; // not time yet

  // Training-day gate (if they specified days; otherwise remind daily).
  const days = (user.trainingDays || "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((d) => !Number.isNaN(d));
  if (days.length && !days.includes(local.weekday))
    return { kind: "skip-not-training-day", localDate: local.date };

  return { kind: "due", localDate: local.date };
}
