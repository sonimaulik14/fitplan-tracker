import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, pushEnabled } from "@/lib/push";
import { reminderDecision } from "@/lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Constant-time bearer-token check. Vercel Cron sends `Authorization: Bearer
// $CRON_SECRET` automatically, so no query-string secret (which would leak into
// access logs) is accepted.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const presented = (req.headers.get("authorization") || "").replace(
    /^Bearer\s+/,
    ""
  );
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
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
    const decision = reminderDecision(u);

    if (decision.kind === "skip-already-notified") continue; // already handled today
    if (decision.kind === "skip-before-time") continue; // not time yet

    // Training-day gate: still mark the day so they aren't re-evaluated today.
    if (decision.kind === "skip-not-training-day") {
      await mark(u.id, decision.localDate);
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
      await mark(u.id, decision.localDate);
      continue;
    }

    const n = await sendPushToUser(u.id, {
      title: "Time to train 💪",
      body: "Today's a training day — log a session to keep your streak going.",
      url: "/workout/next",
      tag: "vajra-daily",
    });
    sent += n;
    await mark(u.id, decision.localDate);
  }

  return Response.json({ ok: true, candidates: users.length, considered, sent });
}

function mark(userId: string, date: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastNotifiedDay: date },
  });
}
