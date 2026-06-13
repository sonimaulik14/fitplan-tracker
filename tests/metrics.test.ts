import { describe, it, expect } from "vitest";
import { est1RM, repTargetMin } from "@/lib/metrics";

describe("est1RM (Epley)", () => {
  it("computes estimated 1-rep max", () => {
    expect(est1RM(100, 1)).toBeCloseTo(103.33, 1);
    expect(est1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(est1RM(60, 5)).toBeCloseTo(70, 1);
  });
});

describe("repTargetMin", () => {
  it("returns the lower bound of a range", () => {
    expect(repTargetMin("8-12")).toBe(8);
    expect(repTargetMin("6-8")).toBe(6);
  });
  it("returns a single number as-is", () => {
    expect(repTargetMin("20")).toBe(20);
  });
  it("sums a giant set like 7 / 7 / 7", () => {
    expect(repTargetMin("7 / 7 / 7")).toBe(21);
  });
  it("returns null for cardio and comma pyramids", () => {
    expect(repTargetMin("20 min")).toBeNull();
    expect(repTargetMin("40 steps")).toBeNull();
    expect(repTargetMin("30, 25, 20, 15")).toBeNull();
  });
});
