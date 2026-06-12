import "server-only";
import { headers } from "next/headers";

// Lightweight in-memory fixed-window rate limiter, keyed by client IP + action.
// Good enough to blunt brute-force / abuse on a single instance; swap for Redis
// if you scale horizontally.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "local"
  );
}

/** Returns true if the request is allowed, false if it should be rejected. */
export async function rateLimit(
  action: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();
  // bound memory: drop expired buckets when the map grows
  if (buckets.size > 2000)
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);

  const key = `${action}:${await clientIp()}`;
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}
