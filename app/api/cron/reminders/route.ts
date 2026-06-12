import { prisma } from "@/lib/prisma";
import { sendPushToUser, pushEnabled } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WEEKDAY: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

// Local weekday (0-6), "HH:MM", and "YYYY-MM-DD" for an IANA timezone.
function localNow(tz: string) {
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
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  let hour = p.hour;
  if (hour === "24") hour = "00"; // some engines emit 24 at midnight
  return {
    weekday: WEEKDAY[p.weekday] ?? 0,
    hm: `${hour}:${p.minute}`,
    date: `${p.year}-${p.month}-${p.day}`,
  };
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const url = new URL(req.url);
  return (
    header === `Bearer ${secret}` || url.searchParams.get("key") === secret
  );
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!pushEnabled())
    return Response.json({ ok: false, reason: "push not configured" });

  // Candidates: reminders on, with at least one subscribed device.
  const users = await prisma.user.findMany({
    where: { remindersOn: true, pushSubscriptions: { some: {} } },
    select: {
      id: true,
      timezone: true,
      reminderTime: true,
      trainingDays: true,
      lastNotifiedDay: true,
    },
  });

  // Start-of-today (UTC) — coarse "already logged today" guard.
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  let sent = 0;
  let considered = 0;

  for (const u of users) {
    const tz = u.timezone || "UTC";
    let now;
    try {
      now = localNow(tz);
    } catch {
      now = localNow("UTC");
    }

    if (u.lastNotifiedDay === now.date) continue; // already handled today
    if (now.hm < (u.reminderTime || "18:00")) continue; // not time yet

    // Training-day gate (if they specified days; otherwise remind daily).
    const days = (u.trainingDays || "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((d) => !Number.isNaN(d));
    if (days.length && !days.includes(now.weekday)) {
      await mark(u.id, now.date);
      continue;
    }

    considered++;

    // Don't nag if they already trained today.
    const logged = await prisma.setEntry.findFirst({
      where: {
        done: true,
        session: { enrollment: { userId: u.id }, performedDate: { gte: since } },
      },
      select: { id: true },
    });
    if (logged) {
      await mark(u.id, now.date);
      continue;
    }

    const n = await sendPushToUser(u.id, {
      title: "Time to train 💪",
      body: "Today's a training day — log a session to keep your streak going.",
      url: "/workout/next",
      tag: "fitplan-daily",
    });
    sent += n;
    await mark(u.id, now.date);
  }

  return Response.json({ ok: true, candidates: users.length, considered, sent });
}

function mark(userId: string, date: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastNotifiedDay: date },
  });
}
