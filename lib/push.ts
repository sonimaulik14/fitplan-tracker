import "server-only";
import webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;

/** Lazily wire up VAPID. Returns false if keys aren't set (feature disabled). */
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:vajra@example.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export function pushEnabled(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Send a notification to every device a user has subscribed. Dead
 * subscriptions (404/410 from the push service) are pruned automatically.
 * Returns the number of notifications successfully delivered.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  if (!ensureConfigured()) return 0;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  const data = JSON.stringify(payload);
  let sent = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    })
  );

  if (dead.length)
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: dead } },
    });

  return sent;
}
