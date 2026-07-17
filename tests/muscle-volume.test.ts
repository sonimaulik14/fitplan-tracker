import { describe, it, expect } from "vitest";
import { weeklyMuscleSets } from "@/lib/metrics/progress";
import { heatIntensity, muscleTint, landmarkVerdict } from "@/lib/ui";

// Minimal plan/session shapes matching what weeklyMuscleSets reads.
const ex = (id: string, muscle: string, isCardio = false) => ({ id, muscle, isCardio });
const set = (
  planExerciseId: string,
  setType: string,
  done: boolean
) => ({ planExerciseId, setType, done });

describe("weeklyMuscleSets", () => {
  const plan = {
    weeks: [
      {
        number: 1,
        days: [
          { id: "d1", exercises: [ex("bench", "Chest"), ex("run", "Cardio", true)] },
          { id: "d2", exercises: [ex("squat", "Legs")] },
        ],
      },
      {
        number: 2,
        days: [{ id: "d3", exercises: [ex("bench", "Chest")] }],
      },
      {
        number: 3, // no sessions this week
        days: [{ id: "d4", exercises: [ex("bench", "Chest")] }],
      },
    ],
  };

  const sessionByDay = new Map([
    [
      "d1",
      {
        setEntries: [
          set("bench", "warmup", true), // warmup — excluded
          set("bench", "work", true), // counts
          set("bench", "work", true), // counts
          set("bench", "work", false), // not done — excluded
          set("run", "work", true), // cardio — excluded
        ],
      },
    ],
    [
      "d2",
      {
        setEntries: [
          set("squat", "work", true), // bodyweight-style, no weight needed — counts
          set("squat", "work", true),
          set("squat", "work", true),
        ],
      },
    ],
    [
      "d3",
      { setEntries: [set("bench", "work", true)] },
    ],
    // d4 has no session
  ]);

  const result = weeklyMuscleSets(plan, sessionByDay);

  it("counts working, non-cardio, done sets per muscle per week", () => {
    expect(result.weekly).toEqual([
      { weekNumber: 1, byMuscle: { Chest: 2, Legs: 3 } },
      { weekNumber: 2, byMuscle: { Chest: 1 } },
      { weekNumber: 3, byMuscle: {} },
    ]);
  });

  it("excludes warmups, cardio, and undone sets from totals", () => {
    expect(result.doneWorkByMuscle).toEqual({ Chest: 3, Legs: 3 });
  });

  it("weeksTrained counts only weeks with a logged working set (min 1)", () => {
    expect(result.weeksTrained).toBe(2);
  });

  it("returns weeksTrained of at least 1 when nothing is logged", () => {
    const empty = weeklyMuscleSets(plan, new Map());
    expect(empty.weeksTrained).toBe(1);
    expect(empty.doneWorkByMuscle).toEqual({});
  });

  it("attributes orphan set entries to Other", () => {
    const orphan = weeklyMuscleSets(
      { weeks: [{ number: 1, days: [{ id: "d1", exercises: [] }] }] },
      new Map([["d1", { setEntries: [set("ghost", "work", true)] }]])
    );
    expect(orphan.doneWorkByMuscle).toEqual({ Other: 1 });
  });
});

describe("heatIntensity", () => {
  const l = { mrv: 20 };
  it("is 0 for no sets", () => {
    expect(heatIntensity(0, l)).toBe(0);
    expect(heatIntensity(-5, l)).toBe(0);
  });
  it("scales linearly against MRV", () => {
    expect(heatIntensity(10, l)).toBeCloseTo(0.5, 5);
  });
  it("clamps at 1 when at or above MRV", () => {
    expect(heatIntensity(20, l)).toBe(1);
    expect(heatIntensity(40, l)).toBe(1);
  });
  it("guards a zero/negative MRV", () => {
    expect(heatIntensity(5, { mrv: 0 })).toBe(0);
  });
});

describe("muscleTint", () => {
  it("falls back to the neutral surface at zero intensity", () => {
    expect(muscleTint("Chest", 0)).toBe("var(--surface-2)");
  });
  it("produces a color-mix ramp for positive intensity", () => {
    expect(muscleTint("Chest", 1)).toMatch(/^color-mix\(in srgb, #ff5b8a 90%, transparent\)$/);
    expect(muscleTint("Chest", 0.5)).toMatch(/color-mix\(in srgb, #ff5b8a 49%, transparent\)/);
  });
});

describe("landmarkVerdict", () => {
  const l = { mev: 8, mav: 14, mrv: 22 };
  it("flags below MEV", () => {
    expect(landmarkVerdict(5, l)).toEqual({ label: "Below MEV", tone: "low" });
  });
  it("flags the productive range", () => {
    expect(landmarkVerdict(14, l)).toEqual({ label: "Productive", tone: "good" });
  });
  it("flags over MRV", () => {
    expect(landmarkVerdict(30, l)).toEqual({ label: "Over MRV", tone: "high" });
  });
});
