import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me"
);
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
  const maxAge = remember ? REMEMBER_AGE : MAX_AGE;
  const token = await new SignJWT({ uid: userId })
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

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const uid = payload.uid as string;
    if (!uid) return null;
    return prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        email: true,
        name: true,
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
  } catch {
    return null;
  }
}
