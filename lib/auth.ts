import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const RAW_SECRET = process.env.AUTH_SECRET;
const SECRET = new TextEncoder().encode(
  RAW_SECRET ?? "dev-insecure-secret-change-me"
);
// Refuse to issue/verify sessions with the insecure default in production —
// checked lazily (not at import) so builds without the runtime secret don't fail.
function assertSecret() {
  if (!RAW_SECRET && process.env.NODE_ENV === "production")
    throw new Error(
      "AUTH_SECRET is not set — refusing to use an insecure default in production."
    );
}
const COOKIE = "fitplan_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days (default)
const REMEMBER_AGE = 60 * 60 * 24 * 365 * 10; // 10 years — effectively "always signed in"

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// `remember` keeps the user signed in indefinitely (10-year cookie + token),
// so they're never auto-logged-out. Default keeps the prior 30-day behaviour.
export async function createSession(userId: string, remember = false) {
  assertSecret();
  const maxAge = remember ? REMEMBER_AGE : MAX_AGE;
  // Embed the user's token version so changing the password can invalidate every
  // previously-issued session.
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  const token = await new SignJWT({ uid: userId, tv: u?.tokenVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(SECRET);

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

// Invalidate every session for a user (e.g. after a password change/reset).
export async function revokeSessions(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

// Wrapped in React cache() so repeated calls within one request (layout, page,
// nested server components) share a single DB lookup instead of re-querying.
export const getCurrentUser = cache(async () => {
  assertSecret();
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const uid = payload.uid as string;
    if (!uid) return null;
    const tv = typeof payload.tv === "number" ? payload.tv : 0;
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        email: true,
        name: true,
        tokenVersion: true,
        unit: true,
        avatarUrl: true,
        goal: true,
        goalWeightKg: true,
        calorieGoal: true,
        proteinGoal: true,
        supplements: true,
        trainingDays: true,
        reminderTime: true,
        remindersOn: true,
        onboardedAt: true,
      },
    });
    // Reject sessions issued before the latest password change.
    if (!user || user.tokenVersion !== tv) return null;
    return user;
  } catch {
    return null;
  }
});
