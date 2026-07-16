import type { ProgramDef } from "./types";
import { muscleBuilder } from "./muscle-builder";

// Placeholder second program — selectable in the picker now; its weeks and
// exercises get added later.
const shortcutToShred: ProgramDef = {
  name: "6-Week Shortcut to Shred",
  description:
    "A fast-paced 6-week fat-loss & conditioning block. Workouts coming soon.",
  totalWeeks: 6,
  styles: {},
  weeks: {},
};

export const PROGRAMS: ProgramDef[] = [muscleBuilder, shortcutToShred];

export type { Day, Ex, ProgramDef } from "./types";
