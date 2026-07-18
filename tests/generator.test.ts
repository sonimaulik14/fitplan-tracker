import { describe, it, expect } from "vitest";
import {
  generateProgram,
  buildSignals,
  LIFT_ANCHORS,
  TRAINABLE_MUSCLES,
  type GeneratorAnswers,
  type GeneratorSignals,
} from "@/lib/generator";
import { ALTERNATIVES } from "@/lib/alternatives";
import { VOLUME_LANDMARKS } from "@/lib/ui";
import { repTargetMin } from "@/lib/reps";
import { inferGroups } from "@/lib/supersets";

const MUSCLES = new Set([...TRAINABLE_MUSCLES, "Cardio", "Other"]);
const CATALOG = new Set(Object.values(ALTERNATIVES).flat().map((a) => a.name));
const NO_SIGNALS: GeneratorSignals = {
  underTrained: [],
  overTrained: [],
  weakestLift: null,
};

const answers = (over: Partial<GeneratorAnswers> = {}): GeneratorAnswers => ({
  daysPerWeek: 5,
  weeks: 8,
  goal: "muscle",
  priorityMuscles: [],
  ...over,
});

/** Weekly working sets per muscle for one week of the draft. */
function weeklySets(week: { days: { exercises: { muscle: string; workingSets: number }[] }[] }) {
  const by: Record<string, number> = {};
  for (const d of week.days)
    for (const e of d.exercises) by[e.muscle] = (by[e.muscle] ?? 0) + e.workingSets;
  return by;
}

describe("generateProgram — structural invariants (validate() mirror)", () => {
  const combos: GeneratorAnswers[] = ([3, 4, 5, 6] as const).flatMap((d) =>
    (["muscle", "strength"] as const).map((goal) => answers({ daysPerWeek: d, goal }))
  );

  for (const a of combos) {
    it(`${a.daysPerWeek}d ${a.goal}: emits a draft savePlanAction would accept`, () => {
      const p = generateProgram(a, NO_SIGNALS);
      expect(p.name.trim().length).toBeGreaterThanOrEqual(3);
      expect(p.name.length).toBeLessThanOrEqual(60);
      expect(p.description.length).toBeLessThanOrEqual(300);
      expect(p.weeks.length).toBe(8);
      p.weeks.forEach((w, wi) => {
        expect(w.number).toBe(wi + 1);
        expect(w.days.length).toBe(7);
        w.days.forEach((d, di) => {
          expect(d.dayNumber).toBe(di + 1);
          expect(d.focus.length).toBeGreaterThan(0);
          expect(d.focus.length).toBeLessThanOrEqual(60);
          expect(d.label.length).toBeGreaterThan(0);
          expect(d.exercises.length).toBeLessThanOrEqual(15);
          for (const e of d.exercises) {
            expect(e.name.length).toBeGreaterThan(0);
            expect(e.name.length).toBeLessThanOrEqual(80);
            expect(MUSCLES.has(e.muscle), e.muscle).toBe(true);
            expect(e.repTarget.length).toBeLessThanOrEqual(20);
            expect(Number.isInteger(e.warmupSets)).toBe(true);
            expect(Number.isInteger(e.workingSets)).toBe(true);
            expect(e.warmupSets).toBeGreaterThanOrEqual(0);
            expect(e.warmupSets).toBeLessThanOrEqual(10);
            expect(e.workingSets).toBeGreaterThanOrEqual(1);
            expect(e.workingSets).toBeLessThanOrEqual(10);
            expect((e.groupLabel ?? "").length).toBeLessThanOrEqual(30);
            // progression engine must understand every rep target
            expect(repTargetMin(e.repTarget), e.repTarget).not.toBeNull();
            // every exercise comes from the app's catalog
            expect(CATALOG.has(e.name), e.name).toBe(true);
          }
        });
      });
      // right number of training days
      const training = p.weeks[0].days.filter((d) => d.exercises.length > 0);
      expect(training.length).toBe(a.daysPerWeek);
    });
  }
});

describe("generateProgram — volume", () => {
  const cases = ([3, 4, 5, 6] as const).flatMap((d) =>
    (["muscle", "strength"] as const).map((g) => [d, g] as const)
  );
  for (const [d, g] of cases) {
    it(`${d}d ${g}: weekly sets per covered muscle land in [mev, mrv]`, () => {
      const p = generateProgram(answers({ daysPerWeek: d, goal: g }), NO_SIGNALS);
      const by = weeklySets(p.weeks[0]); // non-deload week
      for (const [m, sets] of Object.entries(by)) {
        const l = VOLUME_LANDMARKS[m];
        if (!l) continue;
        expect(sets, `${m} weekly sets`).toBeGreaterThanOrEqual(l.mev);
        expect(sets, `${m} weekly sets`).toBeLessThanOrEqual(l.mrv);
      }
    });
  }

  it("a priority muscle gets more weekly sets than the neutral run", () => {
    const base = weeklySets(generateProgram(answers(), NO_SIGNALS).weeks[0]);
    const prio = weeklySets(
      generateProgram(answers({ priorityMuscles: ["Chest"] }), NO_SIGNALS).weeks[0]
    );
    expect(prio.Chest).toBeGreaterThan(base.Chest);
  });

  it("an under-trained signal boosts that muscle too", () => {
    const base = weeklySets(generateProgram(answers(), NO_SIGNALS).weeks[0]);
    const boosted = weeklySets(
      generateProgram(answers(), { ...NO_SIGNALS, underTrained: ["Shoulders"] }).weeks[0]
    );
    expect(boosted.Shoulders).toBeGreaterThan(base.Shoulders);
  });
});

describe("generateProgram — personalization & structure", () => {
  it("the weakest lift's anchor leads its slot", () => {
    const p = generateProgram(answers({ daysPerWeek: 5 }), {
      ...NO_SIGNALS,
      weakestLift: { key: "row", label: "Barbell Row", muscle: "Back" },
    });
    const pull = p.weeks[0].days.find((d) => d.label === "Pull")!;
    expect(pull.exercises[0].name).toBe(LIFT_ANCHORS.row.name);
  });

  it("weeks >= 6 end with a ~half-volume deload week", () => {
    const p = generateProgram(answers({ weeks: 8 }), NO_SIGNALS);
    const first = weeklySets(p.weeks[0]);
    const last = weeklySets(p.weeks[7]);
    expect(p.weeks[7].style).toBe("Deload");
    const totalFirst = Object.values(first).reduce((a, b) => a + b, 0);
    const totalLast = Object.values(last).reduce((a, b) => a + b, 0);
    expect(totalLast).toBeLessThanOrEqual(Math.ceil(totalFirst / 2) + 3);
    // 4-week block: no deload
    const short = generateProgram(answers({ weeks: 4 }), NO_SIGNALS);
    expect(short.weeks.every((w) => w.style !== "Deload")).toBe(true);
  });

  it("exercises repeat week to week so the progression engine can track them", () => {
    const p = generateProgram(answers(), NO_SIGNALS);
    const names = (w: (typeof p.weeks)[number]) =>
      w.days.flatMap((d) => d.exercises.map((e) => e.name));
    expect(names(p.weeks[0])).toEqual(names(p.weeks[3]));
  });

  it("every Superset label forms an adjacent pair the logger will group", () => {
    for (const d of [3, 4, 5, 6] as const) {
      const p = generateProgram(answers({ daysPerWeek: d }), NO_SIGNALS);
      for (const dayd of p.weeks[0].days) {
        const labelled = dayd.exercises.filter((e) => e.groupLabel === "Superset");
        if (!labelled.length) continue;
        const groups = inferGroups(
          dayd.exercises.map((e, i) => ({
            id: String(i),
            groupLabel: e.groupLabel ?? null,
            isCardio: e.isCardio,
          }))
        );
        const groupedIds = new Set(groups.flatMap((g) => g.memberIds));
        dayd.exercises.forEach((e, i) => {
          if (e.groupLabel === "Superset")
            expect(groupedIds.has(String(i)), `${dayd.label} ${e.name}`).toBe(true);
        });
      }
    }
  });

  it("no duplicate exercise within a day", () => {
    for (const d of [3, 4, 5, 6] as const) {
      const p = generateProgram(answers({ daysPerWeek: d }), NO_SIGNALS);
      for (const dayd of p.weeks[0].days) {
        const names = dayd.exercises.map((e) => e.name);
        expect(new Set(names).size).toBe(names.length);
      }
    }
  });

  it("is deterministic", () => {
    const a = answers({ priorityMuscles: ["Arms"], goal: "strength" });
    const s: GeneratorSignals = {
      underTrained: ["Chest"],
      overTrained: ["Legs"],
      weakestLift: { key: "bench", label: "Bench Press", muscle: "Chest" },
    };
    expect(generateProgram(a, s)).toEqual(generateProgram(a, s));
  });

  it("anchor names all exist in the catalog and classify correctly", () => {
    for (const { name } of Object.values(LIFT_ANCHORS))
      expect(CATALOG.has(name), name).toBe(true);
  });
});

describe("buildSignals", () => {
  it("degrades to empty signals with no data", () => {
    expect(buildSignals(null, null)).toEqual({
      underTrained: [],
      overTrained: [],
      weakestLift: null,
    });
  });

  it("flags muscles under MEV and over MRV from history", () => {
    const s = buildSignals(null, {
      weeksTrained: 4,
      // Chest 4/wk (< mev 8), Legs 120/wk (> mrv 26), Back 48/4=12 (fine)
      doneWorkByMuscle: { Chest: 16, Legs: 480, Back: 48 },
    });
    expect(s.underTrained).toEqual(["Chest"]);
    expect(s.overTrained).toEqual(["Legs"]);
  });

  it("picks the lowest-ranked lift as weakest", () => {
    const lift = (key: string, muscle: string, levelIndex: number, bandProgress = 0.5) =>
      ({
        key,
        label: key,
        muscle,
        thresholds: [],
        exerciseName: key,
        e1RMkg: 100,
        date: null,
        tested: false,
        standard: { levelIndex, bandProgress },
      }) as never;
    const s = buildSignals(
      {
        latestBwKg: 80,
        lifts: [
          lift("bench", "Chest", 3),
          lift("row", "Back", 1),
          lift("squat", "Legs", 2),
        ],
      } as never,
      null
    );
    expect(s.weakestLift?.key).toBe("row");
    expect(s.weakestLift?.muscle).toBe("Back");
  });
});
