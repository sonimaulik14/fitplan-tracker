import { describe, it, expect } from "vitest";
import { classifyLift, strengthNext, LEVELS } from "@/lib/ui";
import { bestLiftsByCategory, type LiftRow } from "@/lib/metrics/strength";

describe("classifyLift", () => {
  it("matches the canonical barbell lifts", () => {
    const accept: [string, string][] = [
      ["Barbell Squat", "squat"],
      ["Wide-Stance Barbell Squat", "squat"],
      ["Box Squat", "squat"],
      ["Barbell Deadlift", "deadlift"],
      ["Barbell Bench Press — Medium Grip", "bench"],
      ["Seated Barbell Military Press", "ohp"],
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
