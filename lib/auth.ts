import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
  SESSION_COOKIE,
  assertSecret,
  getSecretKey,
  verifySessionToken,
} from "./session";

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days (default)
const REMEMBER_AGE = 60 * 60 * 24 * 90; // 90 days — long-lived but bounded

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// `remember` extends the session to 90 days (sliding on each fresh login).
// Default keeps the prior 30-day behaviour.
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
    .sign(getSecretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
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
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
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
      weeklyReviewOn: true,
      timezone: true,
      onboardedAt: true,
    },
  });
  // Reject sessions issued before the latest password change.
  if (!user || user.tokenVersion !== session.tv) return null;
  return user;
});
