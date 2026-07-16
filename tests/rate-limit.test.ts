import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

// clientIp() reads request headers; return none so every call keys on "local".
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map<string, string>()),
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

import { rateLimit } from "@/lib/rate-limit";

beforeEach(() => {
  // Force the in-memory path unless a test stubs real-looking Upstash env.
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// The module keeps one shared bucket map — unique action names isolate tests.
let n = 0;
const action = () => `test-action-${++n}`;

describe("rateLimit — in-memory fallback", () => {
  it("allows exactly N requests inside the window and blocks N+1", async () => {
    const a = action();
    await expect(rateLimit(a, 3, 60_000)).resolves.toBe(true);
    await expect(rateLimit(a, 3, 60_000)).resolves.toBe(true);
    await expect(rateLimit(a, 3, 60_000)).resolves.toBe(true);
    await expect(rateLimit(a, 3, 60_000)).resolves.toBe(false);
    await expect(rateLimit(a, 3, 60_000)).resolves.toBe(false);
  });

  it("resets the window after windowMs elapses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T00:00:00Z"));
    const a = action();
    await expect(rateLimit(a, 2, 1_000)).resolves.toBe(true);
    await expect(rateLimit(a, 2, 1_000)).resolves.toBe(true);
    await expect(rateLimit(a, 2, 1_000)).resolves.toBe(false);

    vi.setSystemTime(Date.now() + 1_001); // past the window
    await expect(rateLimit(a, 2, 1_000)).resolves.toBe(true);
  });

  it("tracks different actions independently", async () => {
    const a = action();
    const b = action();
    await expect(rateLimit(a, 1, 60_000)).resolves.toBe(true);
    await expect(rateLimit(a, 1, 60_000)).resolves.toBe(false);
    await expect(rateLimit(b, 1, 60_000)).resolves.toBe(true);
  });
});

describe("rateLimit — Upstash path", () => {
  const URL_BASE = "https://fake.upstash.example";

  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", URL_BASE);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  });

  it("counts via INCR and blocks once the count exceeds the limit", async () => {
    let count = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/incr/")) {
        count += 1;
        return { ok: true, json: async () => ({ result: count }) };
      }
      // pexpire on first hit
      return { ok: true, json: async () => ({ result: 1 }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const a = action();
    await expect(rateLimit(a, 2, 60_000)).resolves.toBe(true); // count 1
    await expect(rateLimit(a, 2, 60_000)).resolves.toBe(true); // count 2
    await expect(rateLimit(a, 2, 60_000)).resolves.toBe(false); // count 3 > 2

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.filter((u) => u.includes("/incr/"))).toHaveLength(3);
    // TTL is set only when the key is first created.
    expect(urls.filter((u) => u.includes("/pexpire/"))).toHaveLength(1);
    expect(urls[0]).toContain(URL_BASE);
    // Auth header is sent.
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { Authorization: "Bearer test-token" },
    });
  });

  it("fails CLOSED for critical limits when Redis is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("ECONNREFUSED"))));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(rateLimit(action(), 5, 60_000, { critical: true })).resolves.toBe(false);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("fails OPEN to the in-memory limiter for non-critical limits", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("ECONNREFUSED"))));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const a = action();
    // First call passes through the in-memory fallback...
    await expect(rateLimit(a, 1, 60_000)).resolves.toBe(true);
    // ...which still enforces the limit on repeat calls.
    await expect(rateLimit(a, 1, 60_000)).resolves.toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("treats a non-OK Upstash response as unreachable (fail closed when critical)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(rateLimit(action(), 5, 60_000, { critical: true })).resolves.toBe(false);
    errSpy.mockRestore();
  });
});
