import { describe, it, expect } from "vitest";
import { nextDelayMs, isDue } from "@/lib/offline/backoff";

// random() => 0.5 makes the jitter factor exactly 1.0, so delays are exact.
const mid = () => 0.5;

describe("nextDelayMs", () => {
  it("progresses 5s → 15s → 45s → 135s with neutral jitter", () => {
    expect(nextDelayMs(0, mid)).toBe(5_000);
    expect(nextDelayMs(1, mid)).toBe(15_000);
    expect(nextDelayMs(2, mid)).toBe(45_000);
    expect(nextDelayMs(3, mid)).toBe(135_000);
  });

  it("caps the base delay at 300_000ms", () => {
    // attempts 4 → raw 405_000 is clamped to the 5-minute cap before jitter
    expect(nextDelayMs(4, mid)).toBe(300_000);
    expect(nextDelayMs(12, mid)).toBe(300_000);
  });

  it("applies ±20% jitter around the base delay", () => {
    // random()=0 → factor 0.8; random()=1 → factor 1.2
    expect(nextDelayMs(1, () => 0)).toBe(12_000);
    expect(nextDelayMs(1, () => 1)).toBe(18_000);
    // Jitter applies AFTER the cap, so the ceiling can reach 360_000.
    expect(nextDelayMs(9, () => 0)).toBe(240_000);
    expect(nextDelayMs(9, () => 1)).toBe(360_000);
  });

  it("keeps default-random delays within the ±20% bounds for attempts 0..2", () => {
    const bases = [5_000, 15_000, 45_000];
    for (let attempts = 0; attempts <= 2; attempts++) {
      for (let i = 0; i < 50; i++) {
        const d = nextDelayMs(attempts);
        expect(d).toBeGreaterThanOrEqual(bases[attempts] * 0.8);
        expect(d).toBeLessThanOrEqual(bases[attempts] * 1.2);
      }
    }
  });

  it("treats negative attempts as zero", () => {
    expect(nextDelayMs(-3, mid)).toBe(5_000);
  });
});

describe("isDue", () => {
  it("is always due when there was no previous attempt", () => {
    expect(isDue(0, null, 0, mid)).toBe(true);
    expect(isDue(7, null, 123, mid)).toBe(true);
  });

  it("is not due before the backoff delay has elapsed", () => {
    // attempts 0 → 5s delay with neutral jitter
    expect(isDue(0, 10_000, 14_999, mid)).toBe(false);
  });

  it("is due exactly at and after the delay boundary", () => {
    expect(isDue(0, 10_000, 15_000, mid)).toBe(true);
    expect(isDue(0, 10_000, 20_000, mid)).toBe(true);
  });

  it("uses the escalated delay for later attempts", () => {
    // attempts 2 → 45s delay
    expect(isDue(2, 100_000, 144_999, mid)).toBe(false);
    expect(isDue(2, 100_000, 145_000, mid)).toBe(true);
  });
});
