import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map<string, string>()),
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error("REDIRECT:" + url);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  createSession: vi.fn(),
  destroySession: vi.fn(),
  getCurrentUser: vi.fn(),
  revokeSessions: vi.fn(),
}));

const prisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  passwordResetToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { loginAction, signupAction, resetPasswordAction } from "@/lib/actions/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  hashPassword,
  verifyPassword,
  createSession,
  revokeSessions,
} from "@/lib/auth";
import { hashResetToken } from "@/lib/tokens";
import { redirect } from "next/navigation";

const fd = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

beforeEach(() => {
  vi.resetAllMocks();
  // Re-arm the redirect sentinel after the reset.
  vi.mocked(redirect).mockImplementation(((url: string) => {
    throw new Error("REDIRECT:" + url);
  }) as never);
  vi.mocked(rateLimit).mockResolvedValue(true);
});

describe("loginAction", () => {
  const creds = { email: "user@example.com", password: "hunter22" };

  it("returns a generic error when rate-limited, without touching the DB", async () => {
    vi.mocked(rateLimit).mockResolvedValue(false);
    const res = await loginAction(undefined, fd(creds));
    expect(res?.error).toMatch(/Too many attempts/);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(vi.mocked(rateLimit)).toHaveBeenCalledWith("login", 8, 60_000, {
      critical: true,
    });
  });

  it("returns the same generic error for a wrong password", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", passwordHash: "stored-hash" });
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const res = await loginAction(undefined, fd(creds));
    expect(res).toEqual({ error: "Invalid email or password." });
    expect(vi.mocked(verifyPassword)).toHaveBeenCalledWith("hunter22", "stored-hash");
    expect(vi.mocked(createSession)).not.toHaveBeenCalled();
  });

  it("returns the same generic error for an unknown email (no enumeration)", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await loginAction(undefined, fd(creds));
    expect(res).toEqual({ error: "Invalid email or password." });
    expect(vi.mocked(verifyPassword)).not.toHaveBeenCalled(); // short-circuits
  });

  it("normalizes the email (trim + lowercase) before lookup", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await loginAction(undefined, fd({ ...creds, email: "  User@Example.COM " }));
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
  });

  it("creates a session with remember=true and redirects to /dashboard", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", passwordHash: "stored-hash" });
    vi.mocked(verifyPassword).mockResolvedValue(true);

    await expect(
      loginAction(undefined, fd({ ...creds, remember: "on" }))
    ).rejects.toThrow("REDIRECT:/dashboard");
    expect(vi.mocked(createSession)).toHaveBeenCalledWith("u1", true);
  });

  it("creates a session with remember=false when the box is unchecked", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", passwordHash: "stored-hash" });
    vi.mocked(verifyPassword).mockResolvedValue(true);

    await expect(loginAction(undefined, fd(creds))).rejects.toThrow(
      "REDIRECT:/dashboard"
    );
    expect(vi.mocked(createSession)).toHaveBeenCalledWith("u1", false);
  });

  it("requires both email and password", async () => {
    const res = await loginAction(undefined, fd({ email: "user@example.com" }));
    expect(res?.error).toMatch(/required/);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("resetPasswordAction", () => {
  const form = { token: "raw-reset-token", next: "brand-new-pw", confirm: "brand-new-pw" };

  it("returns an error when rate-limited", async () => {
    vi.mocked(rateLimit).mockResolvedValue(false);
    const res = await resetPasswordAction(undefined, fd(form));
    expect(res?.error).toMatch(/Too many attempts/);
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a short password before any token lookup", async () => {
    const res = await resetPasswordAction(
      undefined,
      fd({ ...form, next: "short", confirm: "short" })
    );
    expect(res?.error).toMatch(/at least 8 characters/);
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    const res = await resetPasswordAction(
      undefined,
      fd({ ...form, confirm: "different-pw-1" })
    );
    expect(res?.error).toMatch(/don't match/);
  });

  it("rejects an expired token row without updating anything", async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: "u1",
      expiresAt: new Date(Date.now() - 1_000),
    });
    const res = await resetPasswordAction(undefined, fd(form));
    expect(res?.error).toMatch(/invalid or has expired/);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(vi.mocked(revokeSessions)).not.toHaveBeenCalled();
  });

  it("rejects an unknown token the same way", async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue(null);
    const res = await resetPasswordAction(undefined, fd(form));
    expect(res?.error).toMatch(/invalid or has expired/);
  });

  it("updates the password, burns the tokens, revokes sessions, signs in and redirects", async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    vi.mocked(hashPassword).mockResolvedValue("new-hash");

    await expect(resetPasswordAction(undefined, fd(form))).rejects.toThrow(
      "REDIRECT:/dashboard"
    );

    // Lookup is by the sha256 of the raw token, never the raw token itself.
    expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashResetToken("raw-reset-token") },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "new-hash" },
    });
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
    });
    expect(vi.mocked(revokeSessions)).toHaveBeenCalledWith("u1");
    expect(vi.mocked(createSession)).toHaveBeenCalledWith("u1");
  });
});

describe("signupAction", () => {
  const form = { name: "New User", email: "new@example.com", password: "longenough1" };

  it("rejects an email that already has an account", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "existing" });
    const res = await signupAction(undefined, fd(form));
    expect(res?.error).toMatch(/already exists/);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(vi.mocked(createSession)).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters before any DB access", async () => {
    const res = await signupAction(undefined, fd({ ...form, password: "short" }));
    expect(res?.error).toMatch(/at least 8 characters/);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("requires all fields", async () => {
    const res = await signupAction(undefined, fd({ name: "X", email: "", password: "longenough1" }));
    expect(res?.error).toMatch(/required/);
  });

  it("returns a generic error when rate-limited", async () => {
    vi.mocked(rateLimit).mockResolvedValue(false);
    const res = await signupAction(undefined, fd(form));
    expect(res?.error).toMatch(/Too many attempts/);
    expect(vi.mocked(rateLimit)).toHaveBeenCalledWith("signup", 5, 60_000, {
      critical: true,
    });
  });

  it("creates the user with a hashed password, signs in, and redirects to onboarding", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    prisma.user.create.mockResolvedValue({ id: "u9" });

    await expect(signupAction(undefined, fd(form))).rejects.toThrow(
      "REDIRECT:/onboarding"
    );
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { name: "New User", email: "new@example.com", passwordHash: "hashed-pw" },
    });
    expect(vi.mocked(createSession)).toHaveBeenCalledWith("u9");
  });
});
