import { describe, it, expect } from "vitest";
import {
  platesPerSide,
  warmupRamp,
  roundToStep,
  KG_PLATES,
  LB_PLATES,
} from "@/lib/plates";

describe("platesPerSide", () => {
  it("loads 100 kg on a 20 kg bar as 25+15 per side", () => {
    const r = platesPerSide(100, 20, KG_PLATES)!;
    expect(r.exact).toBe(true);
    expect(r.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(r.achievedTotal).toBe(100);
  });

  it("handles multiple plates of the same size (140 kg → 2×25 + 10)", () => {
    const r = platesPerSide(140, 20, KG_PLATES)!;
    expect(r.perSide).toEqual([
      { plate: 25, count: 2 },
      { plate: 10, count: 1 },
    ]);
    expect(r.exact).toBe(true);
  });

  it("bar-only when target equals the bar", () => {
    const r = platesPerSide(20, 20, KG_PLATES)!;
    expect(r.perSide).toEqual([]);
    expect(r.achievedTotal).toBe(20);
    expect(r.exact).toBe(true);
  });

  it("returns null below the bar weight", () => {
    expect(platesPerSide(15, 20, KG_PLATES)).toBeNull();
    expect(platesPerSide(NaN, 20, KG_PLATES)).toBeNull();
  });

  it("rounds DOWN to the closest achievable total, never up", () => {
    // 101 kg → 40.5/side; loadable 40.0 → 100 kg total.
    const r = platesPerSide(101, 20, KG_PLATES)!;
    expect(r.achievedTotal).toBe(100);
    expect(r.exact).toBe(false);
  });

  it("works with lb plates (225 lb = 2×45+45... i.e. 2 plates of 45 per side)", () => {
    const r = platesPerSide(225, 45, LB_PLATES)!;
    expect(r.perSide).toEqual([{ plate: 45, count: 2 }]);
    expect(r.exact).toBe(true);
  });
});

describe("warmupRamp", () => {
  it("builds bar → 45% → 65% → 85% → work for a 100 kg squat", () => {
    const ramp = warmupRamp(100, 20, KG_PLATES);
    expect(ramp.map((r) => r.label)).toEqual(["Bar", "45%", "65%", "85%", "Work"]);
    expect(ramp.map((r) => r.weight)).toEqual([20, 45, 65, 85, 100]);
    // reps fall as weight rises
    expect(ramp.map((r) => r.reps)).toEqual([10, 8, 5, 3, 0]);
  });

  it("collapses stages at/below the bar for light work sets", () => {
    const ramp = warmupRamp(30, 20, KG_PLATES);
    expect(ramp[0].label).toBe("Bar");
    // 45% of 30 = 13.5 → ≤ bar → folded; only heavier stages survive
    expect(ramp.every((r) => r.weight >= 20)).toBe(true);
    expect(ramp[ramp.length - 1]).toMatchObject({ label: "Work", weight: 30 });
  });

  it("bar-weight work set is just the bar + work", () => {
    const ramp = warmupRamp(20, 20, KG_PLATES);
    expect(ramp.map((r) => r.label)).toEqual(["Bar", "Work"]);
  });

  it("never places a warm-up stage at or above the working weight", () => {
    const ramp = warmupRamp(25, 20, KG_PLATES);
    const stages = ramp.filter((r) => r.label !== "Work");
    expect(stages.every((r) => r.weight < 25)).toBe(true);
  });

  it("returns [] for nonsense input", () => {
    expect(warmupRamp(0, 20)).toEqual([]);
    expect(warmupRamp(NaN, 20)).toEqual([]);
  });
});

describe("roundToStep", () => {
  it("rounds to the nearest plate-pair increment", () => {
    expect(roundToStep(61.3, 2.5)).toBe(62.5); // 24.52 steps → 25
    expect(roundToStep(66.24, 2.5)).toBe(65); // 26.496 steps → 26
    expect(roundToStep(67.5, 2.5)).toBe(67.5); // already on-step
  });
});
