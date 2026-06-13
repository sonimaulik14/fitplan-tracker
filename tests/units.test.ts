import { describe, it, expect } from "vitest";
import {
  unitToKg,
  kgToUnit,
  weightNum,
  fmtWeight,
  parseRepRange,
  cmToLen,
  lenToCm,
} from "@/lib/ui";
import { alternativesFor, ALTERNATIVES } from "@/lib/alternatives";

describe("unit conversion", () => {
  it("kg <-> lb round-trips", () => {
    expect(unitToKg(220.46226218, "lb")).toBeCloseTo(100, 5);
    expect(kgToUnit(100, "lb")).toBeCloseTo(220.46226218, 5);
    expect(unitToKg(100, "kg")).toBe(100);
    expect(kgToUnit(100, "kg")).toBe(100);
  });

  it("weightNum rounds to 1 decimal in the chosen unit", () => {
    expect(weightNum(100, "kg")).toBe(100);
    expect(weightNum(100, "lb")).toBe(220.5);
    expect(fmtWeight(60, "kg")).toBe("60 kg");
  });

  it("cm <-> inch round-trips", () => {
    expect(lenToCm(10, "lb")).toBeCloseTo(25.4, 5); // lb pref -> inches
    expect(cmToLen(25.4, "lb")).toBe(10);
    expect(cmToLen(30, "kg")).toBe(30); // metric stays cm
  });
});

describe("parseRepRange", () => {
  it("parses ranges and singles", () => {
    expect(parseRepRange("8-12")).toEqual({ min: 8, max: 12 });
    expect(parseRepRange("12-15 (to failure)")).toEqual({ min: 12, max: 15 });
    expect(parseRepRange("20")).toEqual({ min: 20, max: 20 });
  });
  it("returns null for cardio/steps/min", () => {
    expect(parseRepRange("20 min")).toBeNull();
    expect(parseRepRange("40 steps")).toBeNull();
    expect(parseRepRange("to failure")).toBeNull();
  });
});

describe("alternativesFor", () => {
  const muscle = Object.keys(ALTERNATIVES)[0];

  it("excludes the current exercise (case-insensitive)", () => {
    const list = ALTERNATIVES[muscle];
    const current = list[0].name;
    const result = alternativesFor(muscle, current.toUpperCase(), null);
    expect(result.find((a) => a.name === current)).toBeUndefined();
  });

  it("filters by available equipment when a set is given", () => {
    const list = ALTERNATIVES[muscle];
    const equip = list[0].equipment;
    const result = alternativesFor(muscle, "__none__", new Set([equip]));
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((a) => a.equipment === equip)).toBe(true);
  });

  it("returns everything (minus current) when no equipment filter", () => {
    const result = alternativesFor(muscle, "__none__", new Set());
    expect(result.length).toBe(ALTERNATIVES[muscle].length);
  });

  it("returns [] for an unknown muscle", () => {
    expect(alternativesFor("not-a-muscle", "x", null)).toEqual([]);
  });
});
