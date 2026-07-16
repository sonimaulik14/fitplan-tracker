import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// lib/session.ts reads AUTH_SECRET at import time — make sure the dev
// fallback secret is in force before any module under test loads.
const testState = vi.hoisted(() => {
  delete process.env.AUTH_SECRET;
  return { cookieToken: undefined as string | undefined };
});

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) =>
      name === "fitplan_session" && testState.cookieToken != null
        ? { name, value: testState.cookieToken }
        : undefined
    ),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(async () => new Map<string, string>()),
}));

const prisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";

const SECRET = new TextEncoder().encode("dev-insecure-secret-change-me");

async function sign(payload: Record<string, unknown>, expOffsetSeconds = 3600) {
  const nowSec = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(nowSec)
    .setExpirationTime(nowSec + expOffsetSeconds)
    .sign(SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
  testState.cookieToken = undefined;
  prisma.user.findUnique.mockResolvedValue(null);
});

describe("verifySessionToken", () => {
  it("accepts a valid HS256 token signed with the dev fallback secret", async () => {
    const token = await sign({ uid: "u1", tv: 2 });
    await expect(verifySessionToken(token)).resolves.toEqual({ uid: "u1", tv: 2 });
  });

  it("rejects a tampered token", async () => {
    const token = await sign({ uid: "u1", tv: 2 });
    const parts = token.split(".");
    const sig = parts[2];
    // Flip one signature character deterministically.
    const flipped = sig.slice(0, 3) + (sig[3] === "A" ? "B" : "A") + sig.slice(4);
    const tampered = [parts[0], parts[1], flipped].join(".");
    expect(tampered).not.toBe(token);
    await expect(verifySessionToken(tampered)).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await sign({ uid: "u1", tv: 2 }, -1);
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("rejects a token missing uid", async () => {
    const token = await sign({ tv: 2 });
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("rejects an empty-string uid", async () => {
    const token = await sign({ uid: "", tv: 2 });
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("defaults tv to 0 when the claim is missing", async () => {
    const token = await sign({ uid: "u1" });
    await expect(verifySessionToken(token)).resolves.toEqual({ uid: "u1", tv: 0 });
  });

  it("rejects garbage input", async () => {
    await expect(verifySessionToken("not-a-jwt")).resolves.toBeNull();
  });
});

describe("getCurrentUser token-version revocation", () => {
  const dbUser = {
    id: "u1",
    email: "u1@example.com",
    name: "User One",
    tokenVersion: 2,
    unit: "kg",
    avatarUrl: null,
    goal: null,
    goalWeightKg: null,
    calorieGoal: null,
    proteinGoal: null,
    supplements: null,
    trainingDays: null,
    reminderTime: "18:00",
    remindersOn: false,
    onboardedAt: null,
  };

  it("returns null when no session cookie is present", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a session whose tv predates the user's current tokenVersion", async () => {
    testState.cookieToken = await sign({ uid: "u1", tv: 2 });
    prisma.user.findUnique.mockResolvedValue({ ...dbUser, tokenVersion: 3 });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns the user when the token version matches", async () => {
    testState.cookieToken = await sign({ uid: "u1", tv: 2 });
    prisma.user.findUnique.mockResolvedValue({ ...dbUser, tokenVersion: 2 });
    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.id).toBe("u1");
    expect(user!.email).toBe("u1@example.com");
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" } })
    );
  });

  it("returns null when the user row no longer exists", async () => {
    testState.cookieToken = await sign({ uid: "ghost", tv: 0 });
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null for an invalid cookie value without hitting the DB", async () => {
    testState.cookieToken = "garbage";
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("session cookie name", () => {
  it("stays 'fitplan_session' (renaming would sign every user out)", () => {
    expect(SESSION_COOKIE).toBe("fitplan_session");
  });
});
