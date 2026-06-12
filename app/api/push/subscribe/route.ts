import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Body = {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  timezone?: string;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const sub = body.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth)
    return new Response("Invalid subscription", { status: 400 });

  // One row per endpoint; re-subscribing the same device just updates keys.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh, auth },
    create: { userId: user.id, endpoint, p256dh, auth },
  });

  // Capture the device timezone so the reminder cron can resolve local time.
  const tz =
    typeof body.timezone === "string" && body.timezone.length < 64
      ? body.timezone
      : null;
  if (tz) await prisma.user.update({ where: { id: user.id }, data: { timezone: tz } });

  return Response.json({ ok: true });
}
