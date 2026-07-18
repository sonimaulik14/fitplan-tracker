import { describe, it, expect } from "vitest";
import { classifyLift, strengthNext, LEVELS } from "@/lib/ui";
import {
  bestLiftsByCategory,
  testMax,
  mergeTests,
  dailyBestSeries,
  projectCrossing,
  type LiftRow,
  type TrendPoint,
} from "@/lib/metrics/strength";
import { strengthNextByKey } from "@/lib/ui";
import { testRamp, KG_PLATES } from "@/lib/plates";

describe("classifyLift", () => {
  it("matches the canonical barbell lifts", () => {
    const accept: [string, string][] = [
      ["Barbell Squat", "squat"],
      ["Wide-Stance Barbell Squat", "squat"],
      ["Box Squat", "squat"],
      ["Barbell Deadlift", "deadlift"],
      ["Barbell Bench Press — Medium Grip", "bench"],
      ["Seated Barbell Military Press", "ohp"],
      ["Overhead Barbell Press", "ohp"],
      ["Standing Military Press", "ohp"],
      ["Bent-Over Barbell Row", "row"],
      ["Pendlay Row", "row"],
      ["Barbell Curl", "curl"],
      ["EZ-Bar Curl", "curl"],
      ["Wide-Grip Standing Barbell Curl", "curl"],
    ];
    for (const [name, key] of accept) expect(classifyLift(name), name).toBe(key);
  });

  it("rejects accessories and variants that share a substring", () => {
    const reject = [
      "Lying Leg Curl", // leg curl is not a biceps curl
      "Seated Leg Curl",
      "Flat Bench Leg Pull-In", // ab work, not bench press
      "Barbell Rollout From Bench",
      "Bench Dips",
      "Hack Squat",
      "Split Squat",
      "Smith Machine Squat",
      "Dumbbell Squat",
      "Stiff-Legged Barbell Deadlift",
      "Stiff Legged Dumbbell Deadlift",
      "Upright Barbell Row", // shoulder move on back-row standards
      "T-Bar Row",
      "Dumbbell Shoulder Press",
      "Seated Cable Shoulder Press",
      "Smith Machine Overhead Shoulder Press",
      "Overhead Dumbbell Extension", // triceps work, not a press
      "Dumbbell Bench Press",
      "Close-Grip Barbell Bench Press",
      "Smith Machine Bench Press",
      "Machine Preacher Curl",
      "Lying Close-Grip Bar Curl on High Pulley",
      "Leg Press",
    ];
    for (const name of reject) expect(classifyLift(name), name).toBeNull();
  });
});

describe("strengthNext", () => {
  it("ranks a beginner squat with progress toward Novice", () => {
    const r = strengthNext(50, 80, "Barbell Squat")!;
    expect(r.level).toBe("Beginner");
    expect(r.ratio).toBeCloseTo(0.63, 2);
    expect(r.bandProgress).toBeCloseTo(0.625 / 0.75, 5);
    expect(r.next).toEqual({
      level: "Novice",
      thresholdRatio: 0.75,
      targetKg: 60,
      deltaKg: 10,
    });
  });

  it("ranks up at an exact threshold (epsilon guard)", () => {
    const r = strengthNext(140, 80, "Barbell Squat")!;
    expect(r.level).toBe("Advanced"); // 1.75 exactly
    expect(r.bandProgress).toBeCloseTo(0, 5);
    expect(r.next!.level).toBe("Elite");
    expect(r.next!.targetKg).toBeCloseTo(180, 5);
  });

  it("caps at Elite with no next rank", () => {
    const r = strengthNext(240, 80, "Barbell Deadlift")!;
    expect(r.level).toBe("Elite");
    expect(r.next).toBeNull();
    expect(r.bandProgress).toBe(1);
  });

  it("returns null without bodyweight, without a lift, or for accessories", () => {
    expect(strengthNext(100, null, "Barbell Squat")).toBeNull();
    expect(strengthNext(0, 80, "Barbell Squat")).toBeNull();
    expect(strengthNext(100, 80, "Lying Leg Curl")).toBeNull();
  });

  it("LEVELS ladder is the expected five ranks", () => {
    expect(LEVELS).toEqual([
      "Beginner",
      "Novice",
      "Intermediate",
      "Advanced",
      "Elite",
    ]);
  });
});

describe("bestLiftsByCategory", () => {
  const row = (
    name: string,
    weight: number,
    reps: number,
    date: string,
    isCardio = false
  ): LiftRow => ({ name, isCardio, weight, reps, date: new Date(date) });

  it("keeps the best e1RM per category with its exercise and date", () => {
    const best = bestLiftsByCategory([
      row("Barbell Squat", 100, 5, "2026-07-01"), // e1RM 116.7
      row("Barbell Squat", 120, 1, "2026-07-10"), // e1RM 124 — wins
      row("Hack Squat", 300, 10, "2026-07-05"), // excluded variant
      row("Lying Leg Curl", 200, 10, "2026-07-05"), // not a curl
      row("Barbell Curl", 40, 10, "2026-07-08"), // e1RM 53.3
      row("Treadmill", 100, 10, "2026-07-08", true), // cardio ignored
    ]);
    expect([...best.keys()].sort()).toEqual(["curl", "squat"]);
    const squat = best.get("squat")!;
    expect(squat.exerciseName).toBe("Barbell Squat");
    expect(squat.e1RMkg).toBeCloseTo(124, 1);
    expect(squat.date.toISOString().slice(0, 10)).toBe("2026-07-10");
    expect(best.get("curl")!.e1RMkg).toBeCloseTo(53.33, 1);
    expect(best.has("bench")).toBe(false);
  });

  it("ignores zero/invalid weights and reps", () => {
    const best = bestLiftsByCategory([
      row("Barbell Squat", 0, 5, "2026-07-01"),
      row("Barbell Squat", 100, 0, "2026-07-01"),
    ]);
    expect(best.size).toBe(0);
  });
});

describe("testMax", () => {
  it("a tested single counts as its raw weight (no Epley inflation)", () => {
    expect(testMax({ weightKg: 150, reps: 1 })).toBe(150);
  });
  it("multi-rep tests back-calculate via Epley", () => {
    expect(testMax({ weightKg: 140, reps: 3 })).toBeCloseTo(154, 0);
  });
});

describe("mergeTests", () => {
  const setBest = new Map([
    [
      "squat" as const,
      { exerciseName: "Barbell Squat", e1RMkg: 160, date: new Date("2026-07-01") },
    ],
  ]);

  it("a stronger test replaces the set-derived best with a tested flag", () => {
    const merged = mergeTests(setBest, [
      { liftKey: "squat", weightKg: 170, reps: 1, date: new Date("2026-07-15") },
    ]);
    const squat = merged.get("squat")!;
    expect(squat.e1RMkg).toBe(170);
    expect(squat.tested).toBe(true);
    expect(squat.exerciseName).toBe("1RM test");
  });

  it("a weaker test is ignored", () => {
    const merged = mergeTests(setBest, [
      { liftKey: "squat", weightKg: 150, reps: 1, date: new Date("2026-07-15") },
    ]);
    expect(merged.get("squat")!.tested).toBeUndefined();
    expect(merged.get("squat")!.e1RMkg).toBe(160);
  });

  it("a test on an unperformed category creates the entry; junk keys ignored", () => {
    const merged = mergeTests(setBest, [
      { liftKey: "bench", weightKg: 100, reps: 1, date: new Date("2026-07-15") },
      { liftKey: "yoga", weightKg: 999, reps: 1, date: new Date("2026-07-15") },
    ]);
    expect(merged.get("bench")!.e1RMkg).toBe(100);
    expect(merged.size).toBe(2);
  });

  it("does not mutate the input map", () => {
    mergeTests(setBest, [
      { liftKey: "squat", weightKg: 200, reps: 1, date: new Date() },
    ]);
    expect(setBest.get("squat")!.e1RMkg).toBe(160);
  });
});

describe("strengthNextByKey", () => {
  it("matches the name-based path for the same category", () => {
    expect(strengthNextByKey(140, 80, "squat")).toEqual(
      strengthNext(140, 80, "Barbell Squat")
    );
  });
  it("null without bodyweight", () => {
    expect(strengthNextByKey(140, null, "squat")).toBeNull();
  });
});

describe("testRamp", () => {
  it("builds a bar-to-92% ramp with singles at the top", () => {
    const ramp = testRamp(150, 20, KG_PLATES);
    expect(ramp[0]).toEqual({ label: "Bar", weight: 20, reps: 8, pct: 0 });
    const pcts = ramp.map((r) => r.pct);
    expect(pcts).toEqual([0, 40, 60, 75, 85, 92]);
    const last = ramp[ramp.length - 1];
    expect(last.reps).toBe(1);
    expect(last.weight).toBeCloseTo(137.5, 1); // 92% of 150 rounded to 2.5
    // strictly ascending
    for (let i = 1; i < ramp.length; i++)
      expect(ramp[i].weight).toBeGreaterThan(ramp[i - 1].weight);
  });
  it("collapses tiny targets into the bar", () => {
    expect(testRamp(25, 20, KG_PLATES).length).toBeLessThanOrEqual(2);
    expect(testRamp(0, 20, KG_PLATES)).toEqual([]);
  });
});

describe("dailyBestSeries", () => {
  const row = (name: string, weight: number, reps: number, date: string): LiftRow => ({
    name,
    isCardio: false,
    weight,
    reps,
    date: new Date(date),
  });

  it("keeps the best e1RM per category per day, sorted by date", () => {
    const s = dailyBestSeries([
      row("Barbell Squat", 100, 5, "2026-07-10"),
      row("Barbell Squat", 110, 5, "2026-07-10"), // same day, better
      row("Barbell Squat", 105, 5, "2026-07-03"),
      row("Lying Leg Curl", 200, 10, "2026-07-10"), // unclassified
    ]);
    const squat = s.get("squat")!;
    expect(squat).toHaveLength(2);
    expect(squat[0].date.toISOString().slice(0, 10)).toBe("2026-07-03");
    expect(squat[1].e1RMkg).toBeCloseTo(110 * (1 + 5 / 30), 1);
    expect(s.has("curl")).toBe(false);
  });
});

describe("projectCrossing", () => {
  const pt = (date: string, e1RMkg: number): TrendPoint => ({
    date: new Date(date),
    e1RMkg,
  });
  const now = new Date("2026-07-22");

  it("projects a steady climb onto the target date", () => {
    // +1 kg/day trend from 100 on Jul 1 → value(now Jul 22) = 121.
    const points = [
      pt("2026-07-01", 100),
      pt("2026-07-08", 107),
      pt("2026-07-15", 114),
      pt("2026-07-22", 121),
    ];
    const d = projectCrossing(points, 130, now)!;
    // 9 kg to go at 1 kg/day → ~9 days out.
    expect(d.toISOString().slice(0, 10)).toBe("2026-07-31");
  });

  it("needs at least 3 points across 14+ days", () => {
    expect(projectCrossing([pt("2026-07-01", 100), pt("2026-07-20", 120)], 130, now)).toBeNull();
    expect(
      projectCrossing(
        [pt("2026-07-18", 100), pt("2026-07-20", 105), pt("2026-07-21", 110)],
        130,
        now
      )
    ).toBeNull();
  });

  it("stays silent on flat or falling trends", () => {
    const flat = [pt("2026-07-01", 100), pt("2026-07-10", 100), pt("2026-07-20", 100)];
    expect(projectCrossing(flat, 130, now)).toBeNull();
    const falling = [pt("2026-07-01", 110), pt("2026-07-10", 105), pt("2026-07-20", 100)];
    expect(projectCrossing(falling, 130, now)).toBeNull();
  });

  it("caps the horizon at a year and skips already-crossed targets", () => {
    // ~0.02 kg/day: real but slow — 100kg away is decades out.
    const slow = [pt("2026-05-01", 100), pt("2026-06-01", 100.6), pt("2026-07-01", 101.2)];
    expect(projectCrossing(slow, 200, now)).toBeNull();
    // Trend already above the target → nothing to promise.
    const above = [pt("2026-07-01", 150), pt("2026-07-10", 160), pt("2026-07-20", 170)];
    expect(projectCrossing(above, 130, now)).toBeNull();
  });
});
