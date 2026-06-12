// Curated exercise alternatives keyed by the plan's coarse muscle groups, each
// tagged with the primary equipment it needs. Powers the equipment-aware swap:
// "no barbell today? here are dumbbell / machine / bodyweight subs for the same
// muscle." Names intentionally generic so they read well as substitutes.

export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Machine"
  | "Cable"
  | "Bodyweight"
  | "Kettlebell";

export const EQUIPMENT: { id: Equipment; label: string; icon: string }[] = [
  { id: "Barbell", label: "Barbell", icon: "🏋️" },
  { id: "Dumbbell", label: "Dumbbell", icon: "💪" },
  { id: "Machine", label: "Machine", icon: "⚙️" },
  { id: "Cable", label: "Cable", icon: "🔗" },
  { id: "Bodyweight", label: "Bodyweight", icon: "🤸" },
  { id: "Kettlebell", label: "Kettlebell", icon: "🔔" },
];

export type Alternative = { name: string; equipment: Equipment };

export const ALTERNATIVES: Record<string, Alternative[]> = {
  Chest: [
    { name: "Barbell Bench Press", equipment: "Barbell" },
    { name: "Dumbbell Bench Press", equipment: "Dumbbell" },
    { name: "Incline Dumbbell Press", equipment: "Dumbbell" },
    { name: "Machine Chest Press", equipment: "Machine" },
    { name: "Pec Deck Fly", equipment: "Machine" },
    { name: "Cable Fly", equipment: "Cable" },
    { name: "Push-up", equipment: "Bodyweight" },
    { name: "Dips", equipment: "Bodyweight" },
  ],
  Back: [
    { name: "Barbell Row", equipment: "Barbell" },
    { name: "Deadlift", equipment: "Barbell" },
    { name: "Lat Pulldown", equipment: "Cable" },
    { name: "Seated Cable Row", equipment: "Cable" },
    { name: "One-Arm Dumbbell Row", equipment: "Dumbbell" },
    { name: "Machine Row", equipment: "Machine" },
    { name: "Pull-up", equipment: "Bodyweight" },
    { name: "Inverted Row", equipment: "Bodyweight" },
  ],
  Shoulders: [
    { name: "Overhead Barbell Press", equipment: "Barbell" },
    { name: "Dumbbell Shoulder Press", equipment: "Dumbbell" },
    { name: "Lateral Raise", equipment: "Dumbbell" },
    { name: "Arnold Press", equipment: "Dumbbell" },
    { name: "Machine Shoulder Press", equipment: "Machine" },
    { name: "Cable Lateral Raise", equipment: "Cable" },
    { name: "Face Pull", equipment: "Cable" },
    { name: "Pike Push-up", equipment: "Bodyweight" },
  ],
  Legs: [
    { name: "Back Squat", equipment: "Barbell" },
    { name: "Romanian Deadlift", equipment: "Barbell" },
    { name: "Leg Press", equipment: "Machine" },
    { name: "Leg Extension", equipment: "Machine" },
    { name: "Leg Curl", equipment: "Machine" },
    { name: "Goblet Squat", equipment: "Dumbbell" },
    { name: "Walking Lunge", equipment: "Dumbbell" },
    { name: "Bulgarian Split Squat", equipment: "Dumbbell" },
    { name: "Kettlebell Swing", equipment: "Kettlebell" },
    { name: "Bodyweight Squat", equipment: "Bodyweight" },
  ],
  Arms: [
    { name: "Barbell Curl", equipment: "Barbell" },
    { name: "Close-Grip Bench Press", equipment: "Barbell" },
    { name: "Dumbbell Curl", equipment: "Dumbbell" },
    { name: "Hammer Curl", equipment: "Dumbbell" },
    { name: "Overhead Dumbbell Extension", equipment: "Dumbbell" },
    { name: "Cable Curl", equipment: "Cable" },
    { name: "Tricep Pushdown", equipment: "Cable" },
    { name: "Bench Dips", equipment: "Bodyweight" },
  ],
  Calves: [
    { name: "Standing Calf Raise", equipment: "Machine" },
    { name: "Seated Calf Raise", equipment: "Machine" },
    { name: "Leg Press Calf Raise", equipment: "Machine" },
    { name: "Dumbbell Calf Raise", equipment: "Dumbbell" },
    { name: "Single-Leg Calf Raise", equipment: "Bodyweight" },
  ],
  Abs: [
    { name: "Cable Crunch", equipment: "Cable" },
    { name: "Machine Crunch", equipment: "Machine" },
    { name: "Hanging Leg Raise", equipment: "Bodyweight" },
    { name: "Plank", equipment: "Bodyweight" },
    { name: "Ab Wheel Rollout", equipment: "Bodyweight" },
    { name: "Decline Sit-up", equipment: "Bodyweight" },
    { name: "Weighted Russian Twist", equipment: "Dumbbell" },
  ],
};

// Alternatives for a muscle, excluding the current exercise, optionally filtered
// to a set of available equipment. Returns [] when the muscle isn't mapped.
export function alternativesFor(
  muscle: string,
  current: string,
  have: Set<Equipment> | null
): Alternative[] {
  const list = ALTERNATIVES[muscle] ?? [];
  return list.filter(
    (a) =>
      a.name.toLowerCase() !== current.toLowerCase() &&
      (!have || have.size === 0 || have.has(a.equipment))
  );
}

// Best-effort guess of an exercise's required equipment from its name. Returns
// null when we can't tell (treated as "keep it" so we never swap blindly).
export function guessEquipment(name: string): Equipment | null {
  const n = name.toLowerCase();
  if (/kettlebell|\bkb\b|swing/.test(n)) return "Kettlebell";
  if (/cable|pulldown|pull-down|pushdown|push-down|face pull|rope/.test(n))
    return "Cable";
  if (/machine|leg press|leg extension|leg curl|pec deck|smith|hack squat/.test(n))
    return "Machine";
  if (/barbell|deadlift|bench press|back squat|front squat|overhead press|romanian|close-grip/.test(n))
    return "Barbell";
  if (/dumbbell|goblet|arnold|hammer curl|lateral raise|concentration/.test(n))
    return "Dumbbell";
  if (/push-?up|pull-?up|chin-?up|\bdip|plank|bodyweight|sit-?up|leg raise|mountain climber|inverted row|ab wheel/.test(n))
    return "Bodyweight";
  return null;
}

export type Adaptation = {
  exId: string;
  from: string;
  to: string;
  muscle: string;
  equipment: Equipment;
};

// Given a workout's exercises and the equipment the user has, work out which
// lifts can't be done and what to swap them to. Exercises we can't classify, or
// that already fit, are kept. Returns nothing to change when `have` is empty.
export function computeAdaptations(
  exercises: { id: string; name: string; muscle: string; isCardio: boolean }[],
  have: Set<Equipment>
): { changes: Adaptation[]; alreadyFit: number; stuck: string[] } {
  const changes: Adaptation[] = [];
  const stuck: string[] = [];
  let alreadyFit = 0;
  if (have.size === 0) return { changes, alreadyFit, stuck };

  for (const ex of exercises) {
    if (ex.isCardio) continue;
    const guessed = guessEquipment(ex.name);
    const inLibAndAvailable = (ALTERNATIVES[ex.muscle] ?? []).some(
      (a) =>
        a.name.toLowerCase() === ex.name.toLowerCase() && have.has(a.equipment)
    );
    const doable =
      guessed == null || have.has(guessed) || inLibAndAvailable;
    if (doable) {
      alreadyFit++;
      continue;
    }
    const cand = alternativesFor(ex.muscle, ex.name, have)[0];
    if (cand)
      changes.push({
        exId: ex.id,
        from: ex.name,
        to: cand.name,
        muscle: ex.muscle,
        equipment: cand.equipment,
      });
    else stuck.push(ex.name);
  }
  return { changes, alreadyFit, stuck };
}
