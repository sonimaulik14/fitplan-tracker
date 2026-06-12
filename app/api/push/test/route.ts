import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendPushToUser, pushEnabled } from "@/lib/push";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!pushEnabled())
    return new Response("Push isn't configured on the server.", { status: 503 });
  if (!(await rateLimit("push-test", 6, 60_000)))
    return new Response("Slow down a moment.", { status: 429 });

  const sent = await sendPushToUser(user.id, {
    title: "FitPlan reminders are on 🔔",
    body: "This is a test notification — you'll get nudges on your training days.",
    url: "/dashboard",
    tag: "fitplan-test",
  });

  if (sent === 0)
    return new Response("No active subscription on this device.", {
      status: 409,
    });
  return Response.json({ ok: true, sent });
}
