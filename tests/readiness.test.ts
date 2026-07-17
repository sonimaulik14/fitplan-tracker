import { describe, it, expect } from "vitest";
import {
  readinessScore,
  readinessFactor,
  readinessInfo,
  POOR_DAY_SCORE,
} from "@/lib/readiness";

const a = (sleepQuality: number | null, soreness: number | null, energy: number | null) => ({
  sleepQuality,
  soreness,
  energy,
});

describe("readinessScore", () => {
  it("is null until all three are answered", () => {
    expect(readinessScore(a(null, null, null))).toBeNull();
    expect(readinessScore(a(4, null, 4))).toBeNull();
    expect(readinessScore(a(null, 2, 4))).toBeNull();
  });
  it("scores the extremes", () => {
    expect(readinessScore(a(5, 1, 5))).toBe(1); // perfect
    expect(readinessScore(a(1, 5, 1))).toBe(0); // wrecked
  });
  it("an average all-3s day is exactly 0.5", () => {
    expect(readinessScore(a(3, 3, 3))).toBe(0.5);
  });
  it("raising soreness lowers the score (inversion)", () => {
    const fresh = readinessScore(a(4, 1, 4))!;
    const sore = readinessScore(a(4, 5, 4))!;
    expect(sore).toBeLessThan(fresh);
  });
  it("clamps out-of-range input", () => {
    expect(readinessScore(a(9, 0, 7))).toBe(1); // clamped to 5,1,5
  });
});

describe("readinessFactor", () => {
  it("never trims at or above 0.5, or when unanswered", () => {
    expect(readinessFactor(null)).toBe(1);
    expect(readinessFactor(0.5)).toBe(1);
    expect(readinessFactor(1)).toBe(1);
  });
  it("trims 5% between 0.3 and 0.5", () => {
    expect(readinessFactor(0.49)).toBe(0.95);
    expect(readinessFactor(0.3)).toBe(0.95);
  });
  it("trims 10% below 0.3", () => {
    expect(readinessFactor(0.29)).toBe(0.9);
    expect(readinessFactor(0)).toBe(0.9);
  });
});

describe("readinessInfo", () => {
  it("is null when unanswered", () => {
    expect(readinessInfo(null)).toBeNull();
  });
  it("labels the three tiers with trim percentages", () => {
    expect(readinessInfo(0.8)).toEqual({
      factor: 1,
      trimPct: 0,
      label: "Green light",
      tone: "success",
    });
    expect(readinessInfo(0.4)).toEqual({
      factor: 0.95,
      trimPct: 5,
      label: "Take it steady",
      tone: "warn",
    });
    expect(readinessInfo(0.1)).toEqual({
      factor: 0.9,
      trimPct: 10,
      label: "Go light today",
      tone: "warn",
    });
  });
});

describe("POOR_DAY_SCORE", () => {
  it("sits below the trim threshold so nudges are stricter than trims", () => {
    expect(POOR_DAY_SCORE).toBeLessThan(0.5);
  });
});
