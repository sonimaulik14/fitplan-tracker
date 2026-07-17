import { describe, it, expect } from "vitest";
import { inferGroups, groupIndex, nextInRound } from "@/lib/supersets";

const ex = (id: string, groupLabel: string | null = null, isCardio = false) => ({
  id,
  groupLabel,
  isCardio,
});

describe("inferGroups", () => {
  it("chunks a run of Superset labels into pairs", () => {
    const groups = inferGroups([
      ex("a"),
      ex("b", "Superset"),
      ex("c", "Superset"),
      ex("d", "Superset"),
      ex("e", "Superset"),
      ex("f"),
    ]);
    expect(groups.map((g) => g.memberIds)).toEqual([
      ["b", "c"],
      ["d", "e"],
    ]);
    expect(groups[0].label).toBe("Superset");
  });

  it("keeps a Giant Set run of 3-5 as one group", () => {
    const groups = inferGroups([
      ex("a", "Giant Set"),
      ex("b", "Giant Set"),
      ex("c", "Giant Set"),
    ]);
    expect(groups.map((g) => g.memberIds)).toEqual([["a", "b", "c"]]);
  });

  it("leaves overly long Giant Set runs ungrouped (ambiguous)", () => {
    const run = Array.from({ length: 6 }, (_, i) => ex(`g${i}`, "Giant Set"));
    expect(inferGroups(run)).toEqual([]);
  });

  it("leaves singletons ungrouped", () => {
    expect(inferGroups([ex("a", "Superset"), ex("b"), ex("c", "Giant Set")])).toEqual([]);
  });

  it("folds an odd Superset remainder into the last pair as a triple", () => {
    const groups = inferGroups([
      ex("a", "Superset"),
      ex("b", "Superset"),
      ex("c", "Superset"),
    ]);
    expect(groups.map((g) => g.memberIds)).toEqual([["a", "b", "c"]]);
  });

  it("breaks runs on cardio, other labels, and unlabelled exercises", () => {
    const groups = inferGroups([
      ex("a", "Superset"),
      ex("run", "Superset", true), // cardio breaks the run
      ex("b", "Superset"),
      ex("c", "Alternating Sets"),
      ex("d", "Superset"),
    ]);
    expect(groups).toEqual([]);
  });

  it("does not merge separate adjacent label runs", () => {
    const groups = inferGroups([
      ex("a", "Superset"),
      ex("b", "Superset"),
      ex("c", "Giant Set"),
      ex("d", "Giant Set"),
    ]);
    expect(groups.map((g) => [g.label, g.memberIds])).toEqual([
      ["Superset", ["a", "b"]],
      ["Giant Set", ["c", "d"]],
    ]);
  });

  it("is case/whitespace-insensitive on labels", () => {
    const groups = inferGroups([ex("a", "superset "), ex("b", "SUPERSET")]);
    expect(groups.map((g) => g.memberIds)).toEqual([["a", "b"]]);
  });
});

describe("groupIndex", () => {
  it("maps every member id to its group", () => {
    const groups = inferGroups([ex("a", "Superset"), ex("b", "Superset")]);
    const idx = groupIndex(groups);
    expect(idx.get("a")).toBe(groups[0]);
    expect(idx.get("b")).toBe(groups[0]);
    expect(idx.get("zz")).toBeUndefined();
  });
});

describe("nextInRound", () => {
  // A: 1 warmup + 3 work (setNumbers 1..4); B: 0 warmups + 3 work (1..3).
  const member = (
    id: string,
    warmupSets: number,
    workDone: boolean[],
    warmupDone = true
  ) => ({
    id,
    warmupSets,
    rows: [
      ...Array.from({ length: warmupSets }, (_, i) => ({
        setNumber: i + 1,
        setType: "warmup",
        done: warmupDone,
      })),
      ...workDone.map((done, i) => ({
        setNumber: warmupSets + i + 1,
        setType: "work",
        done,
      })),
    ],
  });

  it("points to the partner's same-round set after finishing yours", () => {
    const A = member("A", 1, [true, false, false]); // just did work set 1 (setNumber 2)
    const B = member("B", 0, [false, false, false]);
    expect(nextInRound([A, B], "A", 2)).toEqual({ id: "B", setNumber: 1 });
  });

  it("says rest (null) once every member finished the round", () => {
    const A = member("A", 1, [true, false, false]);
    const B = member("B", 0, [true, false, false]);
    expect(nextInRound([A, B], "B", 1)).toBeNull();
  });

  it("treats the just-completed set as done even if state is stale", () => {
    // Caller checks before optimistic update: A's work set 1 still reads done=false.
    const A = member("A", 1, [false, false, false]);
    const B = member("B", 0, [true, false, false]);
    expect(nextInRound([A, B], "A", 2)).toBeNull();
  });

  it("wraps around the group for out-of-order logging", () => {
    const A = member("A", 0, [false, true]); // round 1 not done
    const B = member("B", 0, [true, true]);
    // B finishes round 2 → round-2 partner sets are done, but wrap finds A round 2 done too… A round 2 IS done.
    // Use round 1: B logs set 1 again? Instead: C finishing round 1 wraps to A.
    const C = member("C", 0, [true, false]);
    expect(nextInRound([A, B, C], "C", 1)).toEqual({ id: "A", setNumber: 1 });
  });

  it("skips members that have no set at this round index", () => {
    const A = member("A", 0, [true, true, false]);
    const B = member("B", 0, [true, true]); // only 2 work sets
    expect(nextInRound([A, B], "A", 3)).toBeNull();
  });

  it("ignores warmup sets entirely", () => {
    const A = member("A", 2, [false, false], false);
    const B = member("B", 0, [false, false]);
    expect(nextInRound([A, B], "A", 1)).toBeNull(); // warmup 1 → not a round
    expect(nextInRound([A, B], "A", 2)).toBeNull(); // warmup 2 → not a round
  });

  it("returns null for unknown exercises", () => {
    const A = member("A", 0, [false]);
    expect(nextInRound([A], "zz", 1)).toBeNull();
  });
});
