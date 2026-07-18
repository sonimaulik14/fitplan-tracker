import { describe, it, expect } from "vitest";
import { prescribe, est1RM, nextSet } from "@/lib/progression";

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

describe("prescribe — readiness trim", () => {
  const base = { repTarget: "8-12", isCardio: false };

  it("readiness 1 or undefined changes nothing", () => {
    const last = { weight: 100, reps: 10, rpe: 7 };
    const plain = prescribe({ ...base, last });
    expect(prescribe({ ...base, last, readiness: 1 })).toEqual(plain);
    expect(prescribe({ ...base, last, readiness: undefined })).toEqual(plain);
  });

  it("never inflates: factor above 1 is clamped", () => {
    const last = { weight: 100, reps: 10, rpe: 7 };
    expect(prescribe({ ...base, last, readiness: 1.2 })).toEqual(
      prescribe({ ...base, last })
    );
  });

  it("an earned jump trimmed below last weight flips to Go lighter today", () => {
    // Topped the range: up to 102.5; ×0.9 = 92.3 <= 100 → honest relabel.
    const p = prescribe({
      ...base,
      last: { weight: 100, reps: 12, rpe: 8 },
      readiness: 0.9,
    })!;
    expect(p.weight).toBeCloseTo(92.3, 5);
    expect(p.reps).toBe(8);
    expect(p.label).toBe("Go lighter today");
    expect(p.tone).toBe("hold");
  });

  it("a small-weight jump that stays above last keeps its up tone", () => {
    // 40 → 42.5; ×0.95 = 40.4 > 40 → still an increase, label stands.
    const p = prescribe({
      ...base,
      last: { weight: 40, reps: 12, rpe: 8 },
      readiness: 0.95,
    })!;
    expect(p.weight).toBeCloseTo(40.4, 5);
    expect(p.tone).toBe("up");
    expect(p.reason).toContain("Trimmed 5%");
  });

  it("hold and beat branches trim weight and append the reason", () => {
    const hold = prescribe({
      ...base,
      last: { weight: 100, reps: 6, rpe: 7 },
      readiness: 0.9,
    })!;
    expect(hold.weight).toBeCloseTo(90, 5);
    expect(hold.tone).toBe("hold");
    expect(hold.reason).toContain("Trimmed 10%");

    const beat = prescribe({
      ...base,
      last: { weight: 100, reps: 10, rpe: 7 },
      readiness: 0.95,
    })!;
    expect(beat.weight).toBeCloseTo(95, 5);
    expect(beat.reps).toBe(11);
    expect(beat.tone).toBe("beat");
  });

  it("the grinder consolidate branch trims too", () => {
    const p = prescribe({
      ...base,
      last: { weight: 100, reps: 10, rpe: 9.5 },
      readiness: 0.9,
    })!;
    expect(p.weight).toBeCloseTo(90, 5);
    expect(p.label).toBe("Consolidate");
  });

  it("plateau deload is never double-trimmed", () => {
    const p = prescribe({
      ...base,
      last: { weight: 100, reps: 8, rpe: 8 },
      plateau: { deloadKg: 90, sessionsStalled: 4 },
      readiness: 0.9,
    })!;
    expect(p.weight).toBe(90);
    expect(p.tone).toBe("deload");
    expect(p.reason).not.toContain("Trimmed");
  });
});

describe("nextSet — live set coach", () => {
  const base = { repTarget: "8-12", isCardio: false, rpe: null };

  it("drops ~7.5% after a below-range set, snapped and strictly lower", () => {
    const a = nextSet({ ...base, weight: 100, reps: 6 })!;
    expect(a.tone).toBe("down");
    expect(a.weight).toBe(92.5); // 92.5 snapped
    expect(a.delta).toBe(-7.5);
    expect(a.extraRest).toBe(0);
  });

  it("drops 10% after a severe miss", () => {
    const a = nextSet({ ...base, weight: 100, reps: 3 })!; // <= floor(8/2)
    expect(a.weight).toBe(90);
    expect(a.note).toContain("strip it back");
  });

  it("a grinding miss also earns extra rest", () => {
    const a = nextSet({ ...base, weight: 100, reps: 6, rpe: 9.5 })!;
    expect(a.extraRest).toBe(30);
  });

  it("small weights: the drop is still strictly below the last set", () => {
    const a = nextSet({ ...base, weight: 20, reps: 6 })!;
    expect(a.weight).toBeLessThan(20);
  });

  it("suggests +step after an easy top-of-range set", () => {
    const a = nextSet({ ...base, weight: 100, reps: 12, rpe: 7 })!;
    expect(a.tone).toBe("up");
    expect(a.weight).toBe(102.5);
  });

  it("top of range without an easy RPE stays silent", () => {
    expect(nextSet({ ...base, weight: 100, reps: 12, rpe: 8.5 })).toBeNull();
    expect(nextSet({ ...base, weight: 100, reps: 12 })).toBeNull();
  });

  it("an in-range grinder holds the weight and adds rest", () => {
    const a = nextSet({ ...base, weight: 100, reps: 10, rpe: 9.5 })!;
    expect(a.tone).toBe("hold");
    expect(a.weight).toBe(100);
    expect(a.extraRest).toBe(30);
  });

  it("stays silent for normal in-range sets", () => {
    expect(nextSet({ ...base, weight: 100, reps: 10, rpe: 8 })).toBeNull();
  });

  it("returns null for cardio, missing data, unparseable targets", () => {
    expect(nextSet({ ...base, weight: 100, reps: 10, isCardio: true })).toBeNull();
    expect(nextSet({ ...base, weight: null, reps: 10 })).toBeNull();
    expect(nextSet({ ...base, weight: 100, reps: null })).toBeNull();
    expect(nextSet({ ...base, weight: 100, reps: 5, repTarget: "20 min" })).toBeNull();
  });

  it("rounds to the pound step when asked", () => {
    const a = nextSet({ ...base, weight: 225, reps: 6, step: 5 })!;
    expect(a.weight % 5).toBe(0);
    expect(a.weight).toBe(210); // 225*0.925=208.1 → snap 210, < 220 ✓
  });
});
