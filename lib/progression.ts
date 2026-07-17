// The progression engine: turns last time's performance into a concrete
// prescription for today. Pure and client-safe (no server imports) so the
// logger can react to sets as they're typed.
//
// Core rule is double progression (climb the rep range, then add weight),
// modulated by two extra signals when we have them:
//   - RPE of the last top set: an easy top-of-range set earns a double jump;
//     a grinder at the top of the range consolidates instead of adding reps.
//   - Plateau state (est. 1RM stalled 3+ sessions): prescribe the deload
//     instead of nudging a number that's stopped moving.

import { parseRepRange } from "./reps";

/** Epley estimated 1-rep max. Reps ≤ 0 returns 0 (no lift, no estimate). */
export function est1RM(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export type LastPerformance = {
  weight: number; // kg
  reps: number;
  rpe?: number | null; // of that set, when logged
};

export type PlateauState = {
  deloadKg: number;
  sessionsStalled: number;
};

export type Prescription = {
  weight: number; // kg
  reps: number;
  label: string;
  reason: string;
  tone: "up" | "hold" | "beat" | "deload";
};

// RPE at/below this on a top-of-range set = "had plenty in the tank".
const EASY_RPE = 7.5;
// RPE at/above this mid-range = "a grinder" — repeat, don't add.
const GRINDER_RPE = 9.5;

/**
 * Today's prescription for a lift. Null when there's nothing to go on
 * (cardio, never performed, or an unparseable rep target).
 */
export function prescribe(args: {
  last: LastPerformance | null;
  repTarget: string;
  isCardio: boolean;
  plateau?: PlateauState | null;
  increment?: number; // kg added on progression (default 2.5)
}): Prescription | null {
  const { last, repTarget, isCardio, plateau, increment = 2.5 } = args;
  if (isCardio || !last || !last.weight) return null;
  const r = parseRepRange(repTarget);
  if (!r) return null;

  if (plateau && plateau.deloadKg > 0) {
    return {
      weight: plateau.deloadKg,
      reps: r.min,
      label: "Deload & rebuild",
      reason: `Stalled ${plateau.sessionsStalled} sessions — drop ~10%, own the reps, climb back stronger.`,
      tone: "deload",
    };
  }

  const rpe = last.rpe ?? null;

  if (last.reps >= r.max) {
    const easy = rpe != null && rpe <= EASY_RPE;
    const bump = easy ? increment * 2 : increment;
    return {
      weight: Math.round((last.weight + bump) * 10) / 10,
      reps: r.min,
      label: easy ? "Felt easy — jump up 🚀" : "Add weight 💪",
      reason: easy
        ? `Topped the range at RPE ${rpe} — take the double jump.`
        : "Topped the rep range — time to load more.",
      tone: "up",
    };
  }

  if (last.reps < r.min) {
    return {
      weight: last.weight,
      reps: r.min,
      label: "Hold & hit reps",
      reason: "Same weight until the bottom of the range is yours.",
      tone: "hold",
    };
  }

  if (rpe != null && rpe >= GRINDER_RPE) {
    return {
      weight: last.weight,
      reps: last.reps,
      label: "Consolidate",
      reason: `Last set was RPE ${rpe} — repeat it crisper before adding reps.`,
      tone: "hold",
    };
  }

  return {
    weight: last.weight,
    reps: Math.min(r.max, last.reps + 1),
    label: "Beat it by a rep",
    reason: "Mid-range — add one rep at this weight.",
    tone: "beat",
  };
}
