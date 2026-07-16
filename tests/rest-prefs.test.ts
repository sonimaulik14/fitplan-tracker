import { describe, it, expect, beforeEach } from "vitest";
import {
  parseRestPrefs,
  clampRest,
  getRestPref,
  setRestPref,
  clearRestPref,
} from "@/lib/restPrefs";

// Minimal localStorage shim for the node test environment.
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

describe("clampRest", () => {
  it("clamps to 15..600 and rounds", () => {
    expect(clampRest(5)).toBe(15);
    expect(clampRest(3600)).toBe(600);
    expect(clampRest(89.6)).toBe(90);
  });
});

describe("parseRestPrefs", () => {
  it("returns {} for null, junk JSON, and non-objects", () => {
    expect(parseRestPrefs(null)).toEqual({});
    expect(parseRestPrefs("not json")).toEqual({});
    expect(parseRestPrefs('"a string"')).toEqual({});
    expect(parseRestPrefs("[1,2]")).toEqual({});
  });

  it("normalizes keys and clamps values, dropping non-numeric entries", () => {
    const parsed = parseRestPrefs(
      JSON.stringify({ "Barbell Squat": 180, "curl ": 5, junk: "abc" })
    );
    expect(parsed).toEqual({ "barbell squat": 180, curl: 15 });
  });
});

describe("get/set/clear round-trip", () => {
  it("stores per exercise, case-insensitively", () => {
    setRestPref("Barbell Squat", 180);
    expect(getRestPref("barbell squat")).toBe(180);
    expect(getRestPref("BARBELL SQUAT")).toBe(180);
    expect(getRestPref("Bench Press")).toBeNull();
  });

  it("overwrites and clears", () => {
    setRestPref("Curl", 60);
    setRestPref("Curl", 75);
    expect(getRestPref("curl")).toBe(75);
    clearRestPref("CURL");
    expect(getRestPref("curl")).toBeNull();
  });

  it("clamps on write", () => {
    setRestPref("Deadlift", 9999);
    expect(getRestPref("deadlift")).toBe(600);
  });
});
