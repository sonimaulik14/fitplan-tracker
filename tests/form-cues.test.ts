import { describe, it, expect, beforeEach } from "vitest";
import { getCue, setCue, clearCue, parseCues, MAX_CUE_LENGTH } from "@/lib/formCues";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as Record<string, unknown>).window = globalThis;
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

describe("form cues", () => {
  it("round-trips a cue, case/whitespace-insensitively keyed", () => {
    setCue("Barbell Bench Press", "elbows tucked, pause at the chest");
    expect(getCue("  barbell bench press ")).toBe(
      "elbows tucked, pause at the chest"
    );
    expect(getCue("Back Squat")).toBeNull();
  });

  it("trims and caps the cue text", () => {
    setCue("Squat", "  " + "x".repeat(200));
    expect(getCue("Squat")!.length).toBe(MAX_CUE_LENGTH);
  });

  it("an empty cue clears the entry", () => {
    setCue("Squat", "knees out");
    setCue("Squat", "   ");
    expect(getCue("Squat")).toBeNull();
    setCue("Squat", "knees out");
    clearCue("Squat");
    expect(getCue("Squat")).toBeNull();
  });

  it("tolerates junk in storage", () => {
    store.set("vajra-form-cues", "not json{{");
    expect(getCue("Squat")).toBeNull();
    expect(parseCues("[1,2]")).toEqual({});
    expect(parseCues(JSON.stringify({ a: 1, b: "ok", c: " " }))).toEqual({
      b: "ok",
    });
  });
});
