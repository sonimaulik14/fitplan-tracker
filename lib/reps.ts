// Pure rep-target parsing helpers. Client-safe: no Prisma, no server-only
// imports. Consolidated home for the rep-scheme parsing previously split
// between lib/ui.ts (parseRepRange) and lib/metrics.ts (repTargetMin).

/** Parse "8-12", "20", "12-15 (to failure)" -> {min,max}. null for cardio/steps/min. */
export function parseRepRange(target: string): { min: number; max: number } | null {
  const t = target.toLowerCase();
  if (t.includes("min") || t.includes("step")) return null;
  const range = t.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const single = t.match(/\d+/);
  if (single) return { min: Number(single[0]), max: Number(single[0]) };
  return null;
}

/**
 * Pull the lower bound of a rep target string ("12-20 (to failure)" -> 12,
 * "6-8" -> 6, "20" -> 20, "7 / 7 / 7" -> 21). Returns null when there's no
 * meaningful rep count (e.g. "40 steps", "20 min").
 */
export function repTargetMin(target: string): number | null {
  const t = target.toLowerCase();
  if (t.includes("min") || t.includes("step")) return null;
  // Comma-separated pyramids (DTP, e.g. "30, 25, 20, 15, 10, 5") have no single
  // rep target — exclude them from rep-quality scoring.
  if (t.includes(",")) return null;
  // sets like "7 / 7 / 7" -> total reps
  if (/\d+\s*\/\s*\d+/.test(t)) {
    const nums = t.match(/\d+/g)?.map(Number) ?? [];
    return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
  }
  // Plain range ("8-12" -> 8) or single number ("20" -> 20): same rules as
  // parseRepRange's lower bound, so delegate.
  return parseRepRange(target)?.min ?? null;
}
