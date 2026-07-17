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
  /** Day readiness factor from readinessFactor(). >=1/undefined = no change. Never inflates. */
  readiness?: number;
}): Prescription | null {
  const { last, repTarget, isCardio, plateau, increment = 2.5 } = args;
  if (isCardio || !last || !last.weight) return null;
  const r = parseRepRange(repTarget);
  if (!r) return null;
  const f = Math.min(1, args.readiness ?? 1);

  // Plateau deload is already a ~10% cut — never stack the readiness trim on it.
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
    return trimForReadiness(
      {
        weight: Math.round((last.weight + bump) * 10) / 10,
        reps: r.min,
        label: easy ? "Felt easy — jump up 🚀" : "Add weight 💪",
        reason: easy
          ? `Topped the range at RPE ${rpe} — take the double jump.`
          : "Topped the rep range — time to load more.",
        tone: "up",
      },
      f,
      last.weight
    );
  }

  if (last.reps < r.min) {
    return trimForReadiness(
      {
        weight: last.weight,
        reps: r.min,
        label: "Hold & hit reps",
        reason: "Same weight until the bottom of the range is yours.",
        tone: "hold",
      },
      f,
      last.weight
    );
  }

  if (rpe != null && rpe >= GRINDER_RPE) {
    return trimForReadiness(
      {
        weight: last.weight,
        reps: last.reps,
        label: "Consolidate",
        reason: `Last set was RPE ${rpe} — repeat it crisper before adding reps.`,
        tone: "hold",
      },
      f,
      last.weight
    );
  }

  return trimForReadiness(
    {
      weight: last.weight,
      reps: Math.min(r.max, last.reps + 1),
      label: "Beat it by a rep",
      reason: "Mid-range — add one rep at this weight.",
      tone: "beat",
    },
    f,
    last.weight
  );
}

/**
 * Apply the day's readiness trim to a prescription. An "up" whose trimmed
 * weight lands at/below last time's isn't "Add weight" any more — relabel
 * honestly. Nothing is lost: prescriptions are computed, never stored, so the
 * earned jump re-derives from `last` next session.
 */
function trimForReadiness(
  p: Prescription,
  f: number,
  lastWeight: number
): Prescription {
  if (f >= 1) return p;
  const weight = Math.round(p.weight * f * 10) / 10;
  const pct = Math.round((1 - f) * 100);
  if (p.tone === "up" && weight <= lastWeight) {
    return {
      weight,
      reps: p.reps,
      label: "Go lighter today",
      reason: `You earned a jump, but readiness is low — trim ${pct}% and bank a crisp session.`,
      tone: "hold",
    };
  }
  return { ...p, weight, reason: `${p.reason} Trimmed ${pct}% — low readiness.` };
}
