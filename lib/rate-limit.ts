import "server-only";
import { headers } from "next/headers";

// Fixed-window rate limiter keyed by client IP + action.
//
// Uses Upstash Redis (shared across serverless instances) when
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, via Upstash's REST
// API (no extra dependency). Otherwise falls back to a per-instance in-memory
// map — fine for a single instance / local dev, looser across many lambdas.

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

function inMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 2000)
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

async function upstash(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  // INCR the key; on first hit, set its TTL. Fixed-window counter.
  const auth = { Authorization: `Bearer ${token}` };
  const k = `rl:${key}`;
  const res = await fetch(`${url}/incr/${encodeURIComponent(k)}`, {
    headers: auth,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const count = Number((await res.json()).result);
  if (count === 1) {
    await fetch(
      `${url}/pexpire/${encodeURIComponent(k)}/${windowMs}`,
      { headers: auth, cache: "no-store" }
    ).catch(() => {});
  }
  return count <= limit;
}

/**
 * Returns true if the request is allowed, false if it should be rejected.
 *
 * `critical` governs what happens when Upstash is configured but unreachable:
 * critical limits (login, signup, password reset) fail CLOSED — a Redis outage
 * must not silently drop auth throttling to weak per-lambda counters — while
 * cosmetic limits fail open to the in-memory fallback. When Upstash isn't
 * configured at all, both use the in-memory limiter (local dev unchanged).
 */
export async function rateLimit(
  action: string,
  limit: number,
  windowMs: number,
  opts: { critical?: boolean } = {}
): Promise<boolean> {
  const key = `${action}:${await clientIp()}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      return await upstash(url, token, key, limit, windowMs);
    } catch (err) {
      if (opts.critical) {
        console.error(
          `[rate-limit] Redis unreachable — failing CLOSED for "${action}":`,
          err
        );
        return false;
      }
      console.warn(
        `[rate-limit] Redis unreachable — failing open to in-memory for "${action}":`,
        err
      );
      return inMemory(key, limit, windowMs);
    }
  }
  return inMemory(key, limit, windowMs);
}
