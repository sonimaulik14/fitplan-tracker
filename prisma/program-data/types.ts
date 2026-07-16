// Shared types, DSL helpers and common exercise definitions for the seed
// program data. Each program module (e.g. muscle-builder.ts) builds its weeks
// from these and exports a ProgramDef consumed by prisma/seed.ts.

export type Ex = {
  name: string;
  muscle: string;
  warmupSets?: number;
  workingSets?: number;
  repTarget: string;
  groupLabel?: string;
  isCardio?: boolean;
};

export type Day = {
  dayNumber: number;
  label: string;
  focus: string;
  exercises: Ex[];
};

export type ProgramDef = {
  name: string;
  description: string;
  totalWeeks: number;
  /** Week number -> training style label (shown as "Week 1 : YT3"). */
  styles: Record<number, string>;
  /** Week number -> days. Empty = plan shell whose weeks get added later. */
  weeks: Record<number, Day[]>;
};

// Standard interval cardio used at the end of training days.
export const intervalCardio: Ex = {
  name: "Cardio",
  muscle: "Cardio",
  workingSets: 1,
  repTarget: "15-min intervals: 3 min easy / 1 min hard",
  isCardio: true,
};

// Active-rest day used to close out a training week.
export const restDay: Ex = {
  name: "Cardio (active rest)",
  muscle: "Cardio",
  workingSets: 1,
  repTarget: "Light cardio / active recovery",
  isCardio: true,
};

// Fasted steady-state cardio that opens every day (orderIndex 0), so each day
// has cardio twice — morning + the existing end-of-workout session. Folded in
// from the retired prisma/add-morning-cardio.ts patch script.
export const morningCardio: Ex = {
  name: "Morning Cardio",
  muscle: "Cardio",
  workingSets: 1,
  repTarget: "20–30 min steady-state (fasted)",
  isCardio: true,
};

// "8-12 reps" working sets. Warm-ups (1-3 per exercise) are noted on the plan
// but left optional, so they are not counted toward set adherence.
export const lift = (name: string, muscle: string, sets: number): Ex => ({
  name,
  muscle,
  workingSets: sets,
  repTarget: "8-12",
});

export const ex = (
  name: string,
  muscle: string,
  workingSets: number,
  repTarget: string,
  groupLabel?: string
): Ex => ({ name, muscle, workingSets, repTarget, groupLabel });
