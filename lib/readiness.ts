// Readiness scoring for the daily check-in. Pure and client-safe so the
// dashboard card can compute the verdict as the user taps. Every tuning
// constant for auto-regulation lives in this file.

export type ReadinessAnswers = {
  sleepQuality: number | null; // 1 worst .. 5 best
  soreness: number | null; // 1 none .. 5 very sore (higher = worse)
  energy: number | null; // 1 worst .. 5 best
};

/**
 * 0..1 composite; null until all three are answered. Equal linear weighting —
 * transparent and predictable; an all-3s "average day" scores exactly 0.5,
 * which never trims.
 */
export function readinessScore(a: ReadinessAnswers): number | null {
  const { sleepQuality: s, soreness: m, energy: e } = a;
  if (s == null || m == null || e == null) return null;
  const c = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
  // Each answer contributes 0..4 points; soreness is inverted (5 = wrecked = 0).
  return (c(s) - 1 + (c(e) - 1) + (5 - c(m))) / 12;
}

/**
 * Down-only day factor for suggested working weights. 10% matches the app's
 * plateau-deload magnitude; 5% is the mild tier. Never inflates — chasing a
 * "great day" with extra load is how good streaks end.
 */
export function readinessFactor(score: number | null): number {
  if (score == null || score >= 0.5) return 1;
  return score >= 0.3 ? 0.95 : 0.9;
}

/**
 * A "poor" day for rough-patch counting — stricter than the trim threshold so
 * the light-week nudge (a stronger claim) only fires on meaningfully bad days.
 */
export const POOR_DAY_SCORE = 0.4;

export type ReadinessInfo = {
  factor: number;
  trimPct: number;
  label: string;
  tone: "success" | "warn";
};

export function readinessInfo(score: number | null): ReadinessInfo | null {
  if (score == null) return null;
  const factor = readinessFactor(score);
  if (factor === 1)
    return { factor, trimPct: 0, label: "Green light", tone: "success" };
  if (factor === 0.95)
    return { factor, trimPct: 5, label: "Take it steady", tone: "warn" };
  return { factor, trimPct: 10, label: "Go light today", tone: "warn" };
}

// ---------- light week ----------
// One-tap deload: every suggested working weight runs at 90% until the date
// stored in User.lightWeekUntil, then everything reverts automatically.
export const LIGHT_WEEK_FACTOR = 0.9;
export const LIGHT_WEEK_DAYS = 7;

export function lightWeekActive(
  until: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!until) return false;
  const d = typeof until === "string" ? new Date(until) : until;
  return !isNaN(+d) && +d > +now;
}

/**
 * The day's trim for suggested weights: the readiness factor and the light
 * week never stack — a light week floors the factor at 10% off, it doesn't
 * multiply into a poor-readiness day.
 */
export function effectiveTrimFactor(
  score: number | null,
  lightWeek: boolean
): number {
  const f = readinessFactor(score);
  return lightWeek ? Math.min(f, LIGHT_WEEK_FACTOR) : f;
}
