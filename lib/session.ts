import { jwtVerify } from "jose";

// Session-token primitives shared by lib/auth.ts (full session management,
// Prisma-backed) and proxy.ts (request gating). This module must stay free of
// Prisma and next/headers so the proxy can import it.

// Kept as "fitplan_session" deliberately: renaming the cookie would sign every
// existing user out for zero user-visible benefit (it's httpOnly and internal).
export const SESSION_COOKIE = "fitplan_session";

const RAW_SECRET = process.env.AUTH_SECRET;
const SECRET = new TextEncoder().encode(
  RAW_SECRET ?? "dev-insecure-secret-change-me"
);

// Refuse to issue/verify sessions with the insecure default in production —
// checked lazily (not at import) so builds without the runtime secret don't fail.
export function assertSecret() {
  if (!RAW_SECRET && process.env.NODE_ENV === "production")
    throw new Error(
      "AUTH_SECRET is not set — refusing to use an insecure default in production."
    );
}

export function getSecretKey() {
  return SECRET;
}

export type SessionPayload = { uid: string; tv: number };

/**
 * Verify signature + expiry and return the payload, or null. This is the
 * proxy's whole check; token-version revocation needs the DB and stays in
 * getCurrentUser() as defense-in-depth.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  assertSecret();
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const uid = payload.uid;
    if (typeof uid !== "string" || !uid) return null;
    return { uid, tv: typeof payload.tv === "number" ? payload.tv : 0 };
  } catch {
    return null;
  }
}
