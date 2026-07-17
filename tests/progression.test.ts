import { describe, it, expect } from "vitest";
import { prescribe, est1RM } from "@/lib/progression";

describe("est1RM", () => {
  it("Epley: 100 kg × 10 ≈ 133.3", () => {
    expect(est1RM(100, 10)).toBeCloseTo(133.33, 1);
  });
  it("a single is just the weight", () => {
    expect(est1RM(140, 1)).toBeCloseTo(144.67, 1);
  });
  it("no lift → 0", () => {
    expect(est1RM(0, 10)).toBe(0);
    expect(est1RM(100, 0)).toBe(0);
    expect(est1RM(NaN, 5)).toBe(0);
  });
});

describe("prescribe — double progression core", () => {
  const base = { repTarget: "8-12", isCardio: false };

  it("topped the range → add weight, back to bottom of range", () => {
    const p = prescribe({ ...base, last: { weight: 100, reps: 12 } })!;
    expect(p).toMatchObject({ weight: 102.5, reps: 8, tone: "up" });
  });

  it("below the range → hold weight, hit the minimum", () => {
    const p = prescribe({ ...base, last: { weight: 100, reps: 6 } })!;
    expect(p).toMatchObject({ weight: 100, reps: 8, tone: "hold" });
  });

  it("mid-range → one more rep at the same weight", () => {
    const p = prescribe({ ...base, last: { weight: 100, reps: 10 } })!;
    expect(p).toMatchObject({ weight: 100, reps: 11, tone: "beat" });
  });

  it("single-number target behaves as min=max", () => {
    const p = prescribe({
      repTarget: "10",
      isCardio: false,
      last: { weight: 60, reps: 10 },
    })!;
    expect(p).toMatchObject({ weight: 62.5, reps: 10, tone: "up" });
  });

  it("null for cardio, no history, or unparseable targets", () => {
    expect(prescribe({ ...base, last: null })).toBeNull();
    expect(
      prescribe({ ...base, isCardio: true, last: { weight: 1, reps: 1 } })
    ).toBeNull();
    expect(
      prescribe({ repTarget: "20 min", isCardio: false, last: { weight: 50, reps: 5 } })
    ).toBeNull();
  });

  it("custom increment respected", () => {
    const p = prescribe({
      ...base,
      last: { weight: 100, reps: 12 },
      increment: 5,
    })!;
    expect(p.weight).toBe(105);
  });
});

describe("prescribe — RPE modulation", () => {
  const base = { repTarget: "8-12", isCardio: false };

  it("easy top set (RPE ≤ 7.5) → double jump", () => {
    const p = prescribe({ ...base, last: { weight: 100, reps: 12, rpe: 7 } })!;
    expect(p).toMatchObject({ weight: 105, reps: 8, tone: "up" });
    expect(p.reason).toContain("RPE 7");
  });

  it("hard top set (RPE > 7.5) → normal jump", () => {
    const p = prescribe({ ...base, last: { weight: 100, reps: 12, rpe: 9 } })!;
    expect(p.weight).toBe(102.5);
  });

  it("mid-range grinder (RPE ≥ 9.5) → consolidate, not add", () => {
    const p = prescribe({ ...base, last: { weight: 100, reps: 10, rpe: 9.5 } })!;
    expect(p).toMatchObject({ weight: 100, reps: 10, tone: "hold" });
  });

  it("mid-range at moderate RPE still progresses a rep", () => {
    const p = prescribe({ ...base, last: { weight: 100, reps: 10, rpe: 8 } })!;
    expect(p).toMatchObject({ weight: 100, reps: 11, tone: "beat" });
  });

  it("no RPE logged → classic behavior", () => {
    const p = prescribe({ ...base, last: { weight: 100, reps: 12, rpe: null } })!;
    expect(p.weight).toBe(102.5);
  });
});

describe("prescribe — plateau deload", () => {
  it("plateau overrides progression with the deload weight", () => {
    const p = prescribe({
      repTarget: "8-12",
      isCardio: false,
      last: { weight: 100, reps: 12, rpe: 6 }, // would otherwise double-jump
      plateau: { deloadKg: 90, sessionsStalled: 4 },
    })!;
    expect(p).toMatchObject({ weight: 90, reps: 8, tone: "deload" });
    expect(p.reason).toContain("4 sessions");
  });

  it("a zero deload is ignored", () => {
    const p = prescribe({
      repTarget: "8-12",
      isCardio: false,
      last: { weight: 100, reps: 10 },
      plateau: { deloadKg: 0, sessionsStalled: 3 },
    })!;
    expect(p.tone).toBe("beat");
  });
});
