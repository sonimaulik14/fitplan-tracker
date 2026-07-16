// Per-exercise rest durations, keyed by effective exercise name. Stored in
// localStorage (like the equipment prefs): instant, offline-friendly in the
// gym, no round-trip — a rest preference isn't worth a schema.

const KEY = "vajra-rest-times";
const MIN_S = 15;
const MAX_S = 600;

export const clampRest = (s: number): number =>
  Math.min(MAX_S, Math.max(MIN_S, Math.round(s)));

const nameKey = (name: string) => name.trim().toLowerCase();

/** Pure parser (exported for tests): tolerates junk, clamps every value. */
export function parseRestPrefs(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) {
      const n = Number(v);
      if (k && Number.isFinite(n)) out[nameKey(k)] = clampRest(n);
    }
    return out;
  } catch {
    return {};
  }
}

function read(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return parseRestPrefs(localStorage.getItem(KEY));
  } catch {
    return {};
  }
}

export function getRestPref(name: string): number | null {
  return read()[nameKey(name)] ?? null;
}

export function setRestPref(name: string, seconds: number): void {
  if (typeof window === "undefined") return;
  try {
    const all = read();
    all[nameKey(name)] = clampRest(seconds);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full/blocked — preference just doesn't stick */
  }
}

export function clearRestPref(name: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = read();
    delete all[nameKey(name)];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
