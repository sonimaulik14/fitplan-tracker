import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, pushEnabled } from "@/lib/push";
import { weeklyReviewDecision } from "@/lib/reminders";
import { getWeeklyReview } from "@/lib/metrics/review";
import { kgToUnit, type Unit } from "@/lib/ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Constant-time bearer-token check — same contract as /api/cron/reminders
// (Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically).
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

// Monday "week in review" digest. Runs daily; weeklyReviewDecision picks the
// users whose local Mon-Wed morning window this run lands in and dedupes per
// week, so each user gets exactly one digest a week.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!pushEnabled())
    return Response.json({ ok: false, reason: "push not configured" });

  const users = await prisma.user.findMany({
    where: { weeklyReviewOn: true, pushSubscriptions: { some: {} } },
    select: {
      id: true,
      unit: true,
      timezone: true,
      lastWeeklyReviewWeek: true,
    },
  });

  let sent = 0;
  let considered = 0;

  for (const u of users) {
    const decision = weeklyReviewDecision(u);
    if (decision.kind !== "due") continue;
    considered++;

    const review = await getWeeklyReview(u.id);
    // Two silent weeks = nothing worth pushing; mark so we don't recheck
    // until next week.
    if (review.workouts === 0 && review.prevWorkouts === 0) {
      await mark(u.id, decision.weekKey);
      continue;
    }

    const unit = (u.unit as Unit) || "kg";
    const vol = Math.round(kgToUnit(review.volumeKg, unit)).toLocaleString();
    const bits = [
      `${review.workouts} workout${review.workouts === 1 ? "" : "s"}`,
      `${vol} ${unit} moved`,
    ];
    if (review.prCount > 0)
      bits.push(`${review.prCount} strength PR${review.prCount === 1 ? "" : "s"}`);
    const n = await sendPushToUser(u.id, {
      title: "Your week in review 📊",
      body: `${bits.join(" · ")} — see how it stacks up.`,
      url: "/review",
      tag: "vajra-weekly",
    });
    sent += n;
    await mark(u.id, decision.weekKey);
  }

  return Response.json({ ok: true, candidates: users.length, considered, sent });
}

function mark(userId: string, weekKey: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastWeeklyReviewWeek: weekKey },
  });
}
