// Program generator: 4 answers + personalization signals -> a complete
// PlanDraft, opened pre-filled in the plan builder for review and saving.
//
// Pure and deterministic by design: no randomness, no dates, no DB. The same
// inputs always emit the same draft, exercises repeat week to week (the
// progression engine keys off exercise names and drives the load), and every
// emitted value satisfies savePlanAction's validate() rules.

import { ALTERNATIVES } from "./alternatives";
import { VOLUME_LANDMARKS, type LiftKey } from "./ui";
import type { PlanDraft, DraftWeek, DraftDay, DraftExercise } from "./actions/plans";
import type { StrengthProfile } from "./metrics/strength";

export type GeneratorAnswers = {
  daysPerWeek: 3 | 4 | 5 | 6;
  weeks: number; // 4..12
  goal: "muscle" | "strength";
  priorityMuscles: string[]; // subset of the 7 trainable muscles
  cardio?: boolean; // append a 15-min finisher to every training day
};

// Deterministic finisher rotation so consecutive training days vary.
const CARDIO_FINISHERS = [
  "Incline Treadmill Walk",
  "Stationary Bike",
  "Rowing Machine",
];

export type GeneratorSignals = {
  underTrained: string[]; // averaged below MEV in recent history
  overTrained: string[]; // averaged above MRV
  weakestLift: { key: LiftKey; label: string; muscle: string } | null;
};

export const GENERATOR_WEEK_OPTIONS = [4, 6, 8, 10, 12] as const;
export const TRAINABLE_MUSCLES = [
  "Legs",
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Calves",
  "Abs",
] as const;

/**
 * Wizard defaults derived from the onboarding answers, so a fresh user's
 * generator opens pre-configured: their training-day count, their goal
 * (fat-loss maps to hypertrophy + cardio finishers), sensible fallbacks.
 */
export function generatorDefaultsFromUser(u: {
  goal: string | null;
  trainingDays: string | null;
}): { daysPerWeek: 3 | 4 | 5 | 6; goal: "muscle" | "strength"; cardio: boolean } {
  const count = u.trainingDays
    ? u.trainingDays.split(",").filter(Boolean).length
    : 4;
  const daysPerWeek = Math.min(6, Math.max(3, count)) as 3 | 4 | 5 | 6;
  const goal = u.goal === "strength" ? "strength" : "muscle";
  const cardio = u.goal === "fatloss";
  return { daysPerWeek, goal, cardio };
}

// ---------- signals ----------

export function buildSignals(
  profile: StrengthProfile | null,
  progress: { doneWorkByMuscle: Record<string, number>; weeksTrained: number } | null
): GeneratorSignals {
  const underTrained: string[] = [];
  const overTrained: string[] = [];
  if (progress && progress.weeksTrained >= 2) {
    for (const m of TRAINABLE_MUSCLES) {
      const l = VOLUME_LANDMARKS[m];
      if (!l) continue;
      const weekly = (progress.doneWorkByMuscle[m] ?? 0) / progress.weeksTrained;
      if (weekly > 0 && weekly < l.mev) underTrained.push(m);
      else if (weekly > l.mrv) overTrained.push(m);
    }
  }

  let weakestLift: GeneratorSignals["weakestLift"] = null;
  if (profile) {
    const ranked = profile.lifts.filter((l) => l.standard);
    ranked.sort(
      (a, b) =>
        a.standard!.levelIndex - b.standard!.levelIndex ||
        a.standard!.bandProgress - b.standard!.bandProgress
    );
    const w = ranked[0];
    if (w) weakestLift = { key: w.key, label: w.label, muscle: w.muscle };
  }
  return { underTrained, overTrained, weakestLift };
}

// ---------- role tables (every name must exist in ALTERNATIVES — pinned by test) ----------

// The big-lift anchor per strength category; leads its day when it's the
// user's weakest lift.
export const LIFT_ANCHORS: Record<LiftKey, { name: string; muscle: string }> = {
  squat: { name: "Back Squat", muscle: "Legs" },
  deadlift: { name: "Deadlift", muscle: "Back" },
  bench: { name: "Barbell Bench Press", muscle: "Chest" },
  ohp: { name: "Overhead Barbell Press", muscle: "Shoulders" },
  row: { name: "Barbell Row", muscle: "Back" },
  curl: { name: "Barbell Curl", muscle: "Arms" },
};

// ---------- day templates ----------

type Role = "main" | "second" | "iso" | "small";
type Slot = {
  muscle: string;
  role: Role;
  picks: string[]; // preference order; day variant rotates the start index
  superset?: "a" | "b"; // adjacent a/b slots pair as a Superset
};

const SLOT = (
  muscle: string,
  role: Role,
  picks: string[],
  superset?: "a" | "b"
): Slot => ({ muscle, role, picks, superset });

type DayTemplate = { focus: string; label: string; slots: Slot[] };

const FULL_BODY: DayTemplate = {
  focus: "Full Body",
  label: "Full Body",
  slots: [
    SLOT("Legs", "main", ["Back Squat", "Leg Press", "Goblet Squat"]),
    SLOT("Chest", "main", [
      "Barbell Bench Press",
      "Dumbbell Bench Press",
      "Machine Chest Press",
    ]),
    SLOT("Back", "main", ["Barbell Row", "Pull-up", "Lat Pulldown"]),
    SLOT("Shoulders", "second", [
      "Overhead Barbell Press",
      "Dumbbell Shoulder Press",
      "Arnold Press",
    ]),
    SLOT("Arms", "iso", ["Barbell Curl", "Dumbbell Curl", "Cable Curl"], "a"),
    SLOT(
      "Arms",
      "iso",
      ["Tricep Pushdown", "Overhead Dumbbell Extension", "Bench Dips"],
      "a"
    ),
    SLOT("Abs", "small", ["Hanging Leg Raise", "Cable Crunch", "Plank"]),
  ],
};

const UPPER: DayTemplate = {
  focus: "Upper Body",
  label: "Upper",
  slots: [
    SLOT("Chest", "main", [
      "Barbell Bench Press",
      "Incline Dumbbell Press",
      "Dumbbell Bench Press",
    ]),
    SLOT("Back", "main", ["Barbell Row", "Pull-up", "Seated Cable Row"]),
    SLOT("Shoulders", "second", [
      "Overhead Barbell Press",
      "Dumbbell Shoulder Press",
    ]),
    SLOT("Back", "iso", ["Lat Pulldown", "One-Arm Dumbbell Row"], "a"),
    SLOT("Chest", "iso", ["Cable Fly", "Pec Deck Fly"], "a"),
    SLOT("Arms", "iso", ["Barbell Curl", "Hammer Curl"], "b"),
    SLOT("Arms", "iso", ["Tricep Pushdown", "Overhead Dumbbell Extension"], "b"),
  ],
};

const LOWER: DayTemplate = {
  focus: "Lower Body",
  label: "Lower",
  slots: [
    SLOT("Legs", "main", ["Back Squat", "Leg Press", "Goblet Squat"]),
    SLOT("Legs", "second", ["Romanian Deadlift", "Leg Curl", "Kettlebell Swing"]),
    SLOT("Legs", "iso", ["Leg Extension", "Walking Lunge", "Bulgarian Split Squat"]),
    SLOT("Calves", "small", ["Standing Calf Raise", "Seated Calf Raise"], "a"),
    SLOT("Abs", "small", ["Cable Crunch", "Hanging Leg Raise"], "a"),
  ],
};

const PUSH: DayTemplate = {
  focus: "Push — Chest & Shoulders",
  label: "Push",
  slots: [
    SLOT("Chest", "main", [
      "Barbell Bench Press",
      "Incline Dumbbell Press",
      "Dumbbell Bench Press",
    ]),
    SLOT("Shoulders", "second", [
      "Overhead Barbell Press",
      "Dumbbell Shoulder Press",
      "Machine Shoulder Press",
    ]),
    SLOT("Chest", "iso", ["Cable Fly", "Pec Deck Fly", "Push-up"]),
    SLOT("Shoulders", "iso", ["Lateral Raise", "Cable Lateral Raise"]),
    SLOT("Arms", "iso", ["Tricep Pushdown", "Close-Grip Bench Press"], "a"),
    SLOT("Arms", "iso", ["Overhead Dumbbell Extension", "Bench Dips"], "a"),
  ],
};

const PULL: DayTemplate = {
  focus: "Pull — Back & Biceps",
  label: "Pull",
  slots: [
    SLOT("Back", "main", ["Barbell Row", "Deadlift"]),
    SLOT("Back", "second", ["Pull-up", "Lat Pulldown"]),
    SLOT("Back", "iso", ["Seated Cable Row", "One-Arm Dumbbell Row"]),
    SLOT("Shoulders", "iso", ["Face Pull", "Cable Lateral Raise"]),
    SLOT("Arms", "iso", ["Barbell Curl", "Dumbbell Curl"], "a"),
    SLOT("Arms", "iso", ["Hammer Curl", "Cable Curl"], "a"),
  ],
};

const LEGS_DAY: DayTemplate = {
  focus: "Legs",
  label: "Legs",
  slots: [
    SLOT("Legs", "main", ["Back Squat", "Leg Press"]),
    SLOT("Legs", "second", ["Romanian Deadlift", "Bulgarian Split Squat"]),
    SLOT("Legs", "iso", ["Leg Extension", "Walking Lunge"], "a"),
    SLOT("Legs", "iso", ["Leg Curl", "Goblet Squat"], "a"),
    SLOT("Calves", "small", ["Standing Calf Raise", "Seated Calf Raise"]),
    SLOT("Abs", "small", ["Hanging Leg Raise", "Ab Wheel Rollout"]),
  ],
};

/** Training-day layout per daysPerWeek: [dayNumber, template, variant]. */
function splitFor(days: 3 | 4 | 5 | 6): [number, DayTemplate, number][] {
  switch (days) {
    case 3:
      return [
        [1, FULL_BODY, 0],
        [3, FULL_BODY, 1],
        [5, FULL_BODY, 2],
      ];
    case 4:
      return [
        [1, UPPER, 0],
        [2, LOWER, 0],
        [4, UPPER, 1],
        [5, LOWER, 1],
      ];
    case 5:
      return [
        [1, PUSH, 0],
        [2, PULL, 0],
        [3, LEGS_DAY, 0],
        [5, UPPER, 1],
        [6, LOWER, 1],
      ];
    case 6:
      return [
        [1, PUSH, 0],
        [2, PULL, 0],
        [3, LEGS_DAY, 0],
        [4, PUSH, 1],
        [5, PULL, 1],
        [6, LEGS_DAY, 1],
      ];
  }
}

// ---------- schemes ----------

const SCHEMES: Record<
  "muscle" | "strength",
  Record<Role, { reps: string; warmup: number; work: number }>
> = {
  muscle: {
    main: { reps: "6-10", warmup: 1, work: 3 },
    second: { reps: "8-12", warmup: 0, work: 3 },
    iso: { reps: "10-15", warmup: 0, work: 3 },
    small: { reps: "12-20", warmup: 0, work: 3 },
  },
  strength: {
    main: { reps: "3-5", warmup: 2, work: 4 },
    second: { reps: "6-8", warmup: 0, work: 3 },
    iso: { reps: "8-12", warmup: 0, work: 2 },
    small: { reps: "10-15", warmup: 0, work: 3 },
  },
};

// ---------- generation ----------

export function generateProgram(
  a: GeneratorAnswers,
  s: GeneratorSignals
): PlanDraft {
  const weeks = Math.max(4, Math.min(12, Math.round(a.weeks)));
  const scheme = SCHEMES[a.goal];
  const boosted = new Set([
    ...a.priorityMuscles,
    ...s.underTrained,
    ...(s.weakestLift ? [s.weakestLift.muscle] : []),
  ]);
  const anchor = s.weakestLift ? LIFT_ANCHORS[s.weakestLift.key] : null;

  // Build one canonical training week; every week reuses it (progression
  // engine drives the load), the final week deloads.
  const layout = splitFor(a.daysPerWeek);
  const trainingDays = new Map<number, DraftDay>();
  for (const [dayNumber, tpl, variant] of layout) {
    const used = new Set<string>();
    const exercises: DraftExercise[] = [];
    for (const slot of tpl.slots) {
      // The weakest lift's anchor leads matching main/second slots.
      const picks =
        anchor &&
        slot.muscle === anchor.muscle &&
        (slot.role === "main" || slot.role === "second") &&
        !used.has(anchor.name)
          ? [anchor.name, ...slot.picks.filter((p) => p !== anchor.name)]
          : slot.picks;
      const name =
        picks
          .slice(variant % picks.length)
          .concat(picks.slice(0, variant % picks.length))
          .find((p) => !used.has(p)) ?? picks[0];
      used.add(name);
      const sc = scheme[slot.role];
      let work = sc.work;
      if (boosted.has(slot.muscle) && slot.role !== "main") work += 1;
      if (s.overTrained.includes(slot.muscle) && !boosted.has(slot.muscle))
        work = Math.max(2, work - 1);
      exercises.push({
        name,
        muscle: slot.muscle,
        groupLabel: slot.superset ? "Superset" : null,
        warmupSets: sc.warmup,
        workingSets: Math.min(10, work),
        repTarget: sc.reps,
        isCardio: false,
      });
    }
    if (a.cardio)
      exercises.push({
        name: CARDIO_FINISHERS[(dayNumber - 1) % CARDIO_FINISHERS.length],
        muscle: "Cardio",
        groupLabel: null,
        warmupSets: 0,
        workingSets: 1,
        repTarget: "15 min",
        isCardio: true,
      });
    trainingDays.set(dayNumber, {
      dayNumber,
      label: tpl.label,
      focus: tpl.focus,
      // templates are ≤8 exercises; slice is a pure safety net for the ≤15 cap
      exercises: exercises.slice(0, 15),
    });
  }

  // Weekly per-muscle totals must land inside [mev, mrv]: one clamp pass over
  // the whole week (shared across identical weeks).
  clampWeek(trainingDays);

  const weekDays = (deload: boolean): DraftDay[] =>
    Array.from({ length: 7 }, (_, i) => {
      const n = i + 1;
      const t = trainingDays.get(n);
      if (!t) return { dayNumber: n, label: "Rest", focus: "Rest", exercises: [] };
      if (!deload) return { ...t, exercises: t.exercises.map((e) => ({ ...e })) };
      return {
        ...t,
        exercises: t.exercises.map((e) => ({
          ...e,
          workingSets: Math.max(1, Math.floor(e.workingSets / 2)),
        })),
      };
    });

  const styleLabel = a.goal === "muscle" ? "Hypertrophy" : "Strength";
  const weeksArr: DraftWeek[] = Array.from({ length: weeks }, (_, i) => {
    const deload = weeks >= 6 && i === weeks - 1;
    return {
      number: i + 1,
      style: deload ? "Deload" : styleLabel,
      days: weekDays(deload),
    };
  });

  const bits: string[] = [
    `${a.daysPerWeek} days/week for ${weeks} weeks — ${
      a.goal === "muscle" ? "hypertrophy focus" : "strength focus"
    }.`,
  ];
  if (s.underTrained.length)
    bits.push(`Extra ${s.underTrained.join(" & ")} volume (under-trained recently).`);
  if (s.weakestLift)
    bits.push(`${LIFT_ANCHORS[s.weakestLift.key].name} leads its day — your weakest lift.`);
  if (a.priorityMuscles.length)
    bits.push(`Priority: ${a.priorityMuscles.join(", ")}.`);
  if (a.cardio) bits.push("15-min cardio finisher after every session.");
  if (weeks >= 6) bits.push("Final week is a deload.");

  return {
    name: `${a.goal === "muscle" ? "Hypertrophy" : "Strength"} block — ${a.daysPerWeek}d/wk`,
    description: bits.join(" ").slice(0, 300),
    weeks: weeksArr,
  };
}

/**
 * Clamp weekly working sets per muscle into [mev, mrv] by nudging non-main
 * slots up/down one set at a time, round-robin. Deterministic.
 */
function clampWeek(days: Map<number, DraftDay>): void {
  const all = [...days.values()].flatMap((d) => d.exercises);
  for (const m of TRAINABLE_MUSCLES) {
    const l = VOLUME_LANDMARKS[m];
    if (!l) continue;
    const slots = all.filter((e) => e.muscle === m && !e.isCardio);
    if (!slots.length) continue;
    const total = () => slots.reduce((n, e) => n + e.workingSets, 0);
    let guard = 100;
    while (total() < l.mev && guard-- > 0) {
      const t = slots.find((e) => e.workingSets < 10) ?? slots[0];
      if (t.workingSets >= 10) break;
      t.workingSets += 1;
    }
    while (total() > l.mrv && guard-- > 0) {
      const t =
        [...slots].reverse().find((e) => e.workingSets > 2) ??
        [...slots].reverse().find((e) => e.workingSets > 1);
      if (!t) break;
      t.workingSets -= 1;
    }
  }
}
