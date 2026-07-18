// Per-exercise form cues ("elbows tucked, pause at the chest"), stored
// device-locally like rest preferences — keyed by the effective exercise name
// so a cue follows a swap. One JSON blob under a single key.

const KEY = "vajra-form-cues";
export const MAX_CUE_LENGTH = 120;

const nameKey = (name: string) => name.trim().toLowerCase();

/** Tolerant parse — junk JSON or non-objects become an empty map. */
export function parseCues(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj))
      if (typeof v === "string" && v.trim()) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

function read(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return parseCues(window.localStorage.getItem(KEY));
  } catch {
    return {};
  }
}

function write(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage full/blocked — cues are a nicety, fail silently */
  }
}

export function getCue(name: string): string | null {
  return read()[nameKey(name)] ?? null;
}

/** Empty/whitespace cue removes the entry; text is trimmed and capped. */
export function setCue(name: string, cue: string): void {
  const map = read();
  const trimmed = cue.trim().slice(0, MAX_CUE_LENGTH);
  if (trimmed) map[nameKey(name)] = trimmed;
  else delete map[nameKey(name)];
  write(map);
}

export function clearCue(name: string): void {
  setCue(name, "");
}
