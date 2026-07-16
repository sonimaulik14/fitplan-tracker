"use server";

import { redirect } from "next/navigation";
import crypto from "crypto";
import { prisma } from "../prisma";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getCurrentUser,
  revokeSessions,
} from "../auth";
import { rateLimit } from "../rate-limit";
import { hashResetToken } from "../tokens";
import { sendEmail, emailConfigured, passwordResetEmail } from "../email";
import { headers } from "next/headers";

export type AuthState = { error?: string; ok?: boolean } | undefined;

export async function signupAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!(await rateLimit("signup", 5, 60_000, { critical: true })))
    return { error: "Too many attempts. Please wait a minute and try again." };
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password)
    return { error: "All fields are required." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists." };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  await createSession(user.id);
  redirect("/onboarding");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!(await rateLimit("login", 8, 60_000, { critical: true })))
    return { error: "Too many attempts. Please wait a minute and try again." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are required." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return { error: "Invalid email or password." };

  const remember = formData.get("remember") != null;
  await createSession(user.id, remember);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { error: "Not signed in." };
  // Throttle online guessing of the current password.
  if (!(await rateLimit("change-password", 8, 60_000, { critical: true })))
    return { error: "Too many attempts — try again in a minute." };
  if (next.length < 8)
    return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true },
  });
  if (!user || !(await verifyPassword(current, user.passwordHash)))
    return { error: "Current password is incorrect." };

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash: await hashPassword(next) },
  });
  // Invalidate sessions on other devices, then re-issue one for this device so
  // the user stays signed in here.
  await revokeSessions(sessionUser.id);
  await createSession(sessionUser.id);
  return { ok: true };
}

// Request a reset link. Returns a generic message; in this build (no email
// provider) it also returns the link so the flow is fully usable + email-ready.
export async function requestPasswordResetAction(
  _prev: { sent?: boolean; link?: string } | undefined,
  formData: FormData
): Promise<{ sent?: boolean; link?: string }> {
  // Throttle to curb reset-spam and email enumeration. Always report "sent".
  if (!(await rateLimit("reset", 5, 15 * 60_000, { critical: true })))
    return { sent: true };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;

  if (user) {
    const raw = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(raw),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
    // Build an absolute link (emails can't use relative URLs). Prefer the real
    // request origin so it works on any domain; fall back to the configured URL.
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    const origin = host
      ? `${proto}://${host}`
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const link = `${origin}/reset/${raw}`;

    // If an email provider is configured, email the link. Otherwise fall back:
    // log it server-side in production (owner reads it from logs), and expose it
    // to the client only in development. SECURITY: never return the token to the
    // client in production — anyone knowing an email could then take over.
    if (emailConfigured()) {
      const ok = await sendEmail({ to: email, ...passwordResetEmail(link) });
      // Safety net: if the send fails (e.g. unverified-domain restriction),
      // log the link server-side so a stranded user can still be helped
      // manually instead of failing silently.
      if (!ok) console.log(`[password-reset] email send FAILED — link for ${email}: ${link}`);
      return { sent: true };
    }
    if (process.env.NODE_ENV === "production") {
      console.log(`[password-reset] ${email} -> ${link}`);
      return { sent: true };
    }
    return { sent: true, link };
  }
  return { sent: true };
}

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  // Throttle token-guessing attempts (tokens are 256-bit, but defense in depth).
  if (!(await rateLimit("reset-confirm", 10, 15 * 60_000, { critical: true })))
    return { error: "Too many attempts — try again later." };
  const token = String(formData.get("token") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (next !== confirm) return { error: "Passwords don't match." };

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  if (!row || row.expiresAt < new Date())
    return { error: "This reset link is invalid or has expired." };

  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: await hashPassword(next) },
  });
  await prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } });
  // Invalidate any sessions issued before the reset, then sign in fresh.
  await revokeSessions(row.userId);
  await createSession(row.userId);
  redirect("/dashboard");
}
