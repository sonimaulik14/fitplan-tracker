import { describe, it, expect } from "vitest";
import { measurementSeriesFromRows } from "@/lib/metrics/body";

describe("measurementSeriesFromRows", () => {
  it("builds a per-field series, skipping nulls, sorted by date", () => {
    const s = measurementSeriesFromRows([
      { date: new Date(2026, 6, 10), waistCm: 90, armsCm: null },
      { date: new Date(2026, 6, 1), waistCm: 92, armsCm: 38 },
      { date: new Date(2026, 6, 20), bodyFat: 18 },
    ]);
    expect(s.waistCm).toEqual([
      { date: "2026-07-01", value: 92 },
      { date: "2026-07-10", value: 90 },
    ]);
    expect(s.armsCm).toEqual([{ date: "2026-07-01", value: 38 }]);
    expect(s.bodyFat).toEqual([{ date: "2026-07-20", value: 18 }]);
    expect(s.chestCm).toEqual([]);
    expect(s.hipsCm).toEqual([]);
    expect(s.thighsCm).toEqual([]);
  });

  it("returns empty arrays for every field on empty input", () => {
    const s = measurementSeriesFromRows([]);
    expect(Object.values(s).every((arr) => arr.length === 0)).toBe(true);
    expect(Object.keys(s)).toHaveLength(6);
  });
});
