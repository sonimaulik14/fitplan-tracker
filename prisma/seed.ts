import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLAN_NAME = "12-Week Muscle Builder";

type Ex = {
  name: string;
  muscle: string;
  warmupSets?: number;
  workingSets?: number;
  repTarget: string;
  groupLabel?: string;
  isCardio?: boolean;
};

type Day = {
  dayNumber: number;
  label: string;
  focus: string;
  exercises: Ex[];
};

// Standard interval cardio used at the end of training days.
const intervalCardio: Ex = {
  name: "Cardio",
  muscle: "Cardio",
  workingSets: 1,
  repTarget: "15-min intervals: 3 min easy / 1 min hard",
  isCardio: true,
};

// "8-12 reps" working sets. Warm-ups (1-3 per exercise) are noted on the plan
// but left optional, so they are not counted toward set adherence.
const lift = (name: string, muscle: string, sets: number): Ex => ({
  name,
  muscle,
  workingSets: sets,
  repTarget: "8-12",
});

// ---------- WEEK 1 (exact plan as provided) ----------
const week1: Day[] = [
  {
    dayNumber: 1,
    label: "Day 1 — Legs & Abs",
    focus: "Legs & Abs",
    exercises: [
      lift("Leg Press", "Legs", 4),
      lift("Split Squat", "Legs", 3),
      lift("Hack Squat", "Legs", 3),
      lift("Stiff-Legged Barbell Deadlift", "Legs", 4),
      lift("Lying Leg Curl", "Legs", 5),
      lift("Seated Calf Raise", "Calves", 4),
      lift("Standing Calf Raise", "Calves", 4),
      lift("Bent-Knee Hip Raise", "Abs", 4),
      lift("Decline Reverse Crunch", "Abs", 4),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 2 — Chest & Triceps",
    focus: "Chest & Triceps",
    exercises: [
      lift("Incline Dumbbell Press", "Chest", 3),
      lift("Dumbbell Bench Press", "Chest", 3),
      lift("Incline Dumbbell Fly", "Chest", 3),
      lift("Dips — Triceps Version", "Arms", 3),
      lift("Triceps Pushdown", "Arms", 3),
      lift("Kneeling Cable Triceps Pushdown", "Arms", 4),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 3 — Shoulders & Abs",
    focus: "Shoulders & Abs",
    exercises: [
      lift("Cuban Press", "Shoulders", 4),
      lift("Side Lateral Raise", "Shoulders", 4),
      lift("Standing Front Barbell Raise Over Head", "Shoulders", 4),
      lift("Seated Bent-Over Rear Delt Raise", "Shoulders", 4),
      lift("Decline Crunch", "Abs", 4),
      lift("Barbell Rollout From Bench", "Abs", 4),
      intervalCardio,
    ],
  },
  {
    dayNumber: 4,
    label: "Day 4 — Back",
    focus: "Back",
    exercises: [
      lift("Bent-Over Barbell Row", "Back", 3),
      lift("Seated Cable Row", "Back", 3),
      lift("Wide-Grip Lat Pulldown", "Back", 3),
      lift("One-Arm Dumbbell Row", "Back", 3),
      lift("Straight-Arm Dumbbell Pullover", "Back", 3),
      lift("Rack Pulls", "Back", 3),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 5 — Biceps, Calves & Abs",
    focus: "Biceps, Calves & Abs",
    exercises: [
      lift("Barbell Curl", "Arms", 4),
      lift("Dumbbell Alternate Biceps Curl", "Arms", 4),
      lift("EZ-Bar Curl", "Arms", 4),
      lift("Calf Raise", "Calves", 3),
      lift("Standing Calf Raise", "Calves", 4),
      lift("Bent-Knee Hip Raise", "Abs", 4),
      lift("Jackknife Sit-Up", "Abs", 3),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 6 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [
      {
        name: "Cardio (active rest)",
        muscle: "Cardio",
        workingSets: 1,
        repTarget: "Light cardio / active recovery",
        isCardio: true,
      },
    ],
  },
  {
    dayNumber: 7,
    label: "Day 7 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [
      {
        name: "Cardio (active rest)",
        muscle: "Cardio",
        workingSets: 1,
        repTarget: "Light cardio / active recovery",
        isCardio: true,
      },
    ],
  },
];

const ex = (
  name: string,
  muscle: string,
  workingSets: number,
  repTarget: string,
  groupLabel?: string
): Ex => ({ name, muscle, workingSets, repTarget, groupLabel });

// ---------- WEEK 2 — Y3T ----------
const week2: Day[] = [
  {
    dayNumber: 1,
    label: "Day 8 — Legs & Abs",
    focus: "Legs & Abs",
    exercises: [
      ex("Barbell Squat", "Legs", 2, "14-18"),
      ex("Wide-Stance Barbell Squat", "Legs", 2, "14-18"),
      ex("Leg Extension", "Legs", 4, "14-18"),
      ex("Seated Leg Curl", "Legs", 4, "14-18"),
      ex("Hack Squat", "Legs", 4, "14-18"),
      ex("Seated Calf Raise", "Calves", 5, "18-20"),
      ex("Crunch — Legs On Exercise Ball", "Abs", 4, "10 oblique + 10 regular (10s hold)"),
      ex("Crunch", "Abs", 4, "30"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 9 — Chest & Triceps",
    focus: "Chest & Triceps",
    exercises: [
      ex("Incline Dumbbell Press", "Chest", 4, "14-18"),
      ex("Dumbbell Bench Press", "Chest", 4, "14-18"),
      ex("Incline Dumbbell Fly", "Chest", 4, "14-18"),
      ex("Incline Dumbbell Triceps Extension", "Arms", 3, "14-18"),
      ex("Dips — Triceps Version", "Arms", 3, "14-18"),
      ex("Triceps Pushdown", "Arms", 3, "14-18"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 10 — Shoulders & Abs",
    focus: "Shoulders & Abs",
    exercises: [
      ex("Dumbbell Shoulder Press", "Shoulders", 4, "18-20"),
      ex("Seated Side Lateral Raise", "Shoulders", 4, "18-20"),
      ex("Reverse Fly", "Shoulders", 4, "18-20"),
      ex("Front Incline Dumbbell Raise", "Shoulders", 3, "18-20"),
      ex("Dumbbell Shrug", "Shoulders", 4, "18-20"),
      ex("Bottoms Up", "Abs", 6, "18-20"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 4,
    label: "Day 11 — Back",
    focus: "Back",
    exercises: [
      ex("Wide-Grip Lat Pulldown", "Back", 2, "18-20 (warm-up)"),
      ex("Pull-Ups", "Back", 3, "to failure"),
      ex("V-Bar Pull-Up", "Back", 3, "to failure"),
      ex("One-Arm Dumbbell Row", "Back", 3, "14-18"),
      ex("Leverage ISO Row", "Back", 3, "14-18"),
      ex("Wide-Grip Lat Pulldown", "Back", 3, "14-18"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 12 — Biceps, Calves & Abs",
    focus: "Biceps, Calves & Abs",
    exercises: [
      ex("Seated Dumbbell Curl", "Arms", 3, "14-18"),
      ex("Preacher Curl", "Arms", 3, "14-18"),
      ex("Lying Cable Curl", "Arms", 3, "14-18"),
      ex("Standing Calf Raise", "Calves", 4, "18-20"),
      ex("Cable Crunch", "Abs", 4, "18-20"),
      ex("Weighted Crunch", "Abs", 4, "18-20"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 13 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [
      {
        name: "Cardio (active rest)",
        muscle: "Cardio",
        workingSets: 1,
        repTarget: "Light cardio / active recovery",
        isCardio: true,
      },
    ],
  },
  {
    dayNumber: 7,
    label: "Day 14 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [
      {
        name: "Cardio (active rest)",
        muscle: "Cardio",
        workingSets: 1,
        repTarget: "Light cardio / active recovery",
        isCardio: true,
      },
    ],
  },
];

// ---------- WEEK 3 — Y3T ----------
const week3: Day[] = [
  {
    dayNumber: 1,
    label: "Day 15 — Legs & Abs",
    focus: "Legs & Abs",
    exercises: [
      ex("Leg Press", "Legs", 2, "25-35 (drop sets)"),
      ex("Dumbbell Squat", "Legs", 2, "25-35 (drop sets)"),
      ex("Leg Extension", "Legs", 3, "15-20 (double drop)"),
      ex("Lying Leg Curl", "Legs", 5, "15-20", "Superset"),
      ex("Stiff Legged Dumbbell Deadlift", "Legs", 5, "15-20", "Superset"),
      ex("Seated Calf Raise", "Calves", 4, "20-25", "Superset"),
      ex("Standing Calf Raise", "Calves", 4, "20-25", "Superset"),
      ex("Flat Bench Leg Pull-In", "Abs", 4, "20", "Superset"),
      ex("Leg Pull-In", "Abs", 4, "20", "Superset"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 16 — Chest & Triceps",
    focus: "Chest & Triceps",
    exercises: [
      ex("Smith Machine Incline Bench Press", "Chest", 2, "20-25 (drop sets)"),
      ex("Smith Machine Bench Press", "Chest", 2, "20-25 (drop sets)"),
      ex("Incline Dumbbell Fly", "Chest", 3, "15-20 (drop sets)"),
      ex("Cable Crossover", "Chest", 2, "15-20 (drop sets)"),
      ex("Triceps Pushdown", "Arms", 3, "15-20", "Superset"),
      ex("Kneeling Cable Triceps Extension", "Arms", 3, "15-20", "Superset"),
      ex("Seated Triceps Press", "Arms", 3, "15-20", "Superset"),
      ex("Close-Grip Barbell Bench Press", "Arms", 3, "15-20", "Superset"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 17 — Shoulders & Abs",
    focus: "Shoulders & Abs",
    exercises: [
      ex("Standing Dumbbell Press", "Shoulders", 4, "20-25", "Giant Set"),
      ex("Side Lateral Raise", "Shoulders", 3, "20-25", "Giant Set"),
      ex("Front Dumbbell Raise", "Shoulders", 3, "20-25", "Giant Set"),
      ex("Seated Bent-Over Rear Delt Raise", "Shoulders", 4, "20-25", "Superset"),
      ex("Side Lateral to Front Raise", "Shoulders", 4, "15-20", "Superset"),
      ex("Dumbbell Shrug", "Shoulders", 3, "20-25"),
      ex("Press Sit-Up", "Abs", 3, "15-20"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 4,
    label: "Day 18 — Back",
    focus: "Back",
    exercises: [
      ex("Bent-Over Two-Dumbbell Row", "Back", 3, "15-18 (last set drop)"),
      ex("Wide-Grip Lat Pulldown", "Back", 3, "15-20", "Superset"),
      ex("Underhand Cable Pulldown", "Back", 3, "15-20", "Superset"),
      ex("Dumbbell Incline Row", "Back", 3, "15-20", "Superset"),
      ex("Straight-Arm Pulldown", "Back", 3, "15-20", "Superset"),
      ex("Barbell Deadlift", "Back", 3, "15-20"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 19 — Biceps, Calves & Abs",
    focus: "Biceps, Calves & Abs",
    exercises: [
      ex("Wide-Grip Standing Barbell Curl", "Arms", 3, "15-20 (drop sets)"),
      ex("Close-Grip Standing Barbell Curl", "Arms", 3, "15-20"),
      ex("Seated Calf Raise", "Calves", 3, "15-20 (drop sets)"),
      ex("Standing Calf Raise", "Calves", 3, "15-20 (drop sets)"),
      ex("Decline Reverse Crunch", "Abs", 3, "15-20", "Superset"),
      ex("Exercise Ball Pull-In", "Abs", 3, "15-20", "Superset"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 20 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [
      {
        name: "Cardio (active rest)",
        muscle: "Cardio",
        workingSets: 1,
        repTarget: "Light cardio / active recovery",
        isCardio: true,
      },
    ],
  },
  {
    dayNumber: 7,
    label: "Day 21 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [
      {
        name: "Cardio (active rest)",
        muscle: "Cardio",
        workingSets: 1,
        repTarget: "Light cardio / active recovery",
        isCardio: true,
      },
    ],
  },
];

// ---------- WEEK 4 — FST-7 ----------
const week4: Day[] = [
  {
    dayNumber: 1,
    label: "Day 22 — Chest & Triceps",
    focus: "Chest & Triceps",
    exercises: [
      ex("Incline Dumbbell Press", "Chest", 4, "8-10"),
      ex("Dumbbell Bench Press", "Chest", 3, "8-10"),
      ex("Decline Dumbbell Bench Press", "Chest", 3, "8-10"),
      ex("Butterfly", "Chest", 7, "8-10", "FST-7"),
      ex("Reverse Grip Triceps Pushdown", "Arms", 4, "8-10"),
      ex("Close-Grip Barbell Bench Press", "Arms", 3, "8-10"),
      ex("Seated Triceps Press", "Arms", 3, "8-10"),
      ex("Triceps Pushdown — Rope Attachment", "Arms", 7, "8-10", "FST-7"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 23 — Legs (AM + PM)",
    focus: "Legs",
    exercises: [
      ex("Leg Extension", "Legs", 4, "10-15", "AM"),
      ex("Leg Press", "Legs", 4, "10-15", "AM"),
      ex("Hack Squat", "Legs", 4, "10-15", "AM"),
      ex("Smith Machine Squat", "Legs", 7, "10-15", "AM"),
      ex("Lying Leg Curl", "Legs", 4, "10-15", "PM"),
      ex("Stiff-Legged Barbell Deadlift", "Legs", 4, "10-15", "PM"),
      ex("Seated Leg Curl", "Legs", 7, "10-15", "PM"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 24 — Shoulders & Abs",
    focus: "Shoulders & Abs",
    exercises: [
      ex("Standing Dumbbell Press", "Shoulders", 4, "8-10"),
      ex("Seated Side Lateral Raise", "Shoulders", 3, "8-10"),
      ex("Barbell Incline Shoulder Raise", "Shoulders", 3, "8-10"),
      ex("Reverse Machine Fly", "Shoulders", 3, "8-10"),
      ex("Smith Machine Overhead Shoulder Press", "Shoulders", 7, "8-10", "FST-7"),
      ex("Barbell Rollout From Bench", "Abs", 3, "to failure"),
      ex("Cross-Body Crunch", "Abs", 7, "8-10", "FST-7"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 4,
    label: "Day 25 — Back",
    focus: "Back",
    exercises: [
      ex("Wide-Grip Rear Pull-Up", "Back", 2, "10-12 (to failure)"),
      ex("V-Bar Pull-Up", "Back", 2, "10-12 (to failure)"),
      ex("One-Arm Dumbbell Row", "Back", 4, "8-10"),
      ex("T-Bar Row", "Back", 4, "8-10"),
      ex("Barbell Shrug", "Back", 2, "12-15"),
      ex("Seated Cable Row", "Back", 7, "8-10", "FST-7"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 26 — Biceps & Calves",
    focus: "Biceps & Calves",
    exercises: [
      ex("Cable Preacher Curl", "Arms", 4, "8-10"),
      ex("Alternate Incline Dumbbell Curl", "Arms", 3, "8-10"),
      ex("Lying Cable Curl", "Arms", 3, "8-10"),
      ex("Spider Curl", "Arms", 7, "8-10", "FST-7"),
      ex("Seated Calf Raise", "Calves", 3, "20"),
      ex("Calf Press on the Leg Press Machine", "Calves", 3, "20"),
      ex("Donkey Calf Raise", "Calves", 7, "20", "FST-7"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 27 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [
      {
        name: "Cardio (active rest)",
        muscle: "Cardio",
        workingSets: 1,
        repTarget: "Light cardio / active recovery",
        isCardio: true,
      },
    ],
  },
  {
    dayNumber: 7,
    label: "Day 28 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [
      {
        name: "Cardio (active rest)",
        muscle: "Cardio",
        workingSets: 1,
        repTarget: "Light cardio / active recovery",
        isCardio: true,
      },
    ],
  },
];

// Active-rest day used to close out a training week.
const restDay: Ex = {
  name: "Cardio (active rest)",
  muscle: "Cardio",
  workingSets: 1,
  repTarget: "Light cardio / active recovery",
  isCardio: true,
};

// ---------- WEEK 5 — GVT (German Volume Training) ----------
const week5: Day[] = [
  {
    dayNumber: 1,
    label: "Day 29 — Legs & Calves",
    focus: "Legs & Calves",
    exercises: [
      ex("Barbell Squat", "Legs", 10, "10", "GVT"),
      ex("Leg Extension", "Legs", 5, "15"),
      ex("Seated Leg Curl", "Legs", 5, "15"),
      ex("Seated Calf Raise", "Calves", 10, "10", "GVT"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 30 — Chest & Abs",
    focus: "Chest & Abs",
    exercises: [
      ex("Dumbbell Bench Press", "Chest", 10, "10", "GVT"),
      ex("Incline Dumbbell Fly", "Chest", 5, "10"),
      ex("Decline Dumbbell Bench Press", "Chest", 5, "10"),
      ex("Weighted Crunch", "Abs", 10, "10", "GVT"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 31 — Back",
    focus: "Back",
    exercises: [
      ex("Weighted Pull-Up", "Back", 10, "10", "GVT"),
      ex("Bent-Over Barbell Row", "Back", 5, "5"),
      ex("Barbell Shrug", "Back", 5, "20"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 4,
    label: "Day 32 — Shoulders",
    focus: "Shoulders",
    exercises: [
      ex("Dumbbell Shoulder Press", "Shoulders", 5, "10"),
      ex("Arnold Dumbbell Press", "Shoulders", 5, "10"),
      ex("Side Lateral Raise", "Shoulders", 5, "15"),
      ex("Upright Barbell Row", "Shoulders", 5, "15"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 33 — Biceps & Triceps",
    focus: "Biceps & Triceps",
    exercises: [
      ex("Barbell Curl", "Arms", 5, "10"),
      ex("EZ-Bar Curl", "Arms", 5, "10"),
      ex("Dips — Triceps Version", "Arms", 10, "10", "GVT"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 34 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 7,
    label: "Day 35 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
];

// ---------- WEEK 6 — high-volume hypertrophy (2 sets / 8-12) ----------
const week6: Day[] = [
  {
    dayNumber: 1,
    label: "Day 36 — Legs & Calves",
    focus: "Legs & Calves",
    exercises: [
      ex("Leg Extension", "Legs", 2, "15-20"),
      ex("Leg Press", "Legs", 2, "8-12"),
      ex("Hack Squat", "Legs", 2, "8-12"),
      ex("Lying Leg Curl", "Legs", 2, "8-12"),
      ex("Seated Leg Curl", "Legs", 2, "15-20"),
      ex("Seated Calf Raise", "Calves", 2, "8-12"),
      ex("Standing Calf Raise", "Calves", 2, "8-12"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 37 — Shoulders, Traps & Triceps",
    focus: "Shoulders, Traps & Triceps",
    exercises: [
      ex("Seated Barbell Military Press", "Shoulders", 2, "8-12"),
      ex("Side Lateral Raise", "Shoulders", 2, "8-12"),
      ex("Seated Bent-Over Rear Delt Raise", "Shoulders", 2, "8-12"),
      ex("Reverse Machine Fly", "Shoulders", 2, "8-12"),
      ex("Barbell Shrug", "Shoulders", 2, "8-12"),
      ex("Triceps Pushdown", "Arms", 2, "8-12"),
      ex("Lying Triceps Press", "Arms", 2, "8-12"),
      ex("Dumbbell One-Arm Triceps Extension", "Arms", 2, "8-12"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 38 — Cardio",
    focus: "Cardio",
    exercises: [intervalCardio],
  },
  {
    dayNumber: 4,
    label: "Day 39 — Chest & Biceps",
    focus: "Chest & Biceps",
    exercises: [
      ex("Incline Dumbbell Press", "Chest", 2, "8-12"),
      ex("Leverage Chest Press", "Chest", 2, "8-12"),
      ex("Decline Dumbbell Bench Press", "Chest", 2, "8-12"),
      ex("Cable Crossover", "Chest", 2, "8-12"),
      ex("Dumbbell Alternate Biceps Curl", "Arms", 2, "8-12"),
      ex("Barbell Curl", "Arms", 2, "8-12"),
      ex("Machine Preacher Curl", "Arms", 2, "8-12"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 40 — Back & Abs",
    focus: "Back & Abs",
    exercises: [
      ex("Underhand Cable Pulldown", "Back", 2, "8-12"),
      ex("Close-Grip Front Lat Pulldown", "Back", 2, "8-12"),
      ex("Bent-Over Barbell Row", "Back", 2, "8-12"),
      ex("Seated Cable Row", "Back", 2, "8-12"),
      ex("One-Arm Dumbbell Row", "Back", 2, "8-12"),
      ex("Barbell Deadlift", "Back", 2, "8-12"),
      ex("Cable Reverse Crunch", "Abs", 2, "8-12"),
      ex("Sit-Up", "Abs", 2, "8-12"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 41 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 7,
    label: "Day 42 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
];

// ---------- WEEK 7 — DTP Extreme (rep-pyramid ladders + supersets) ----------
const week7: Day[] = [
  {
    dayNumber: 1,
    label: "Day 43 — Legs & Calves",
    focus: "Legs & Calves",
    exercises: [
      ex("Leg Press", "Legs", 12, "30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30"),
      ex("Leg Extension", "Legs", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Seated Leg Curl", "Legs", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Leg Extension", "Legs", 6, "5, 10, 15, 20, 25, 30"),
      ex("Seated Leg Curl", "Legs", 6, "5, 10, 15, 20, 25, 30"),
      ex("Seated Calf Raise", "Calves", 12, "30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 44 — Chest & Biceps",
    focus: "Chest & Biceps",
    exercises: [
      ex("Preacher Curl", "Arms", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Decline Dumbbell Bench Press", "Chest", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Dumbbell Bench Press", "Chest", 6, "5, 10, 15, 20, 25, 30"),
      ex("Barbell Curl", "Arms", 6, "5, 10, 15, 20, 25, 30"),
      ex("Standing Biceps Cable Curl", "Arms", 3, "30, 20, 10", "Superset"),
      ex("Incline Dumbbell Press", "Chest", 3, "30, 20, 10", "Superset"),
      ex("Incline Dumbbell Press", "Chest", 3, "10, 20, 30"),
      ex("Standing Biceps Cable Curl", "Arms", 3, "10, 20, 30"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 45 — Back & Abs",
    focus: "Back & Abs",
    exercises: [
      ex("Bent-Over Two-Dumbbell Row", "Back", 5, "5, 10, 15, 20, 25"),
      ex("Standing Dumbbell Upright Row", "Shoulders", 5, "5, 10, 15, 20, 25"),
      ex("Wide-Grip Lat Pulldown", "Back", 5, "25, 20, 15, 10, 5"),
      ex("Straight-Arm Pulldown", "Back", 5, "5, 10, 15, 20, 25"),
      ex("Weighted Sit-Up With Bands", "Abs", 5, "25, 20, 15, 10, 5"),
      ex("Reverse Crunch", "Abs", 5, "5, 10, 15, 20, 25"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 4,
    label: "Day 46 — Shoulders",
    focus: "Shoulders",
    exercises: [
      ex("Seated Barbell Military Press", "Shoulders", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Cable Seated Lateral Raise", "Shoulders", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Seated Barbell Military Press (Reverse Grip)", "Shoulders", 6, "5, 10, 15, 20, 25, 30"),
      ex("Bent-Over Low-Pulley Side Lateral", "Shoulders", 6, "5, 10, 15, 20, 25, 30"),
      ex("Barbell Shrug", "Shoulders", 3, "30, 20, 10", "Superset"),
      ex("Upright Barbell Row", "Shoulders", 3, "30, 20, 10", "Superset"),
      ex("Barbell Shrug Behind The Back", "Shoulders", 3, "10, 20, 30"),
      ex("Upright Barbell Row (Close-Grip)", "Shoulders", 3, "10, 20, 30"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 47 — Triceps & Calves",
    focus: "Triceps & Calves",
    exercises: [
      ex("Close-Grip Barbell Bench Press", "Arms", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Seated Calf Raise", "Calves", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Barbell Incline Bench Press Medium-Grip", "Chest", 6, "5, 10, 15, 20, 25, 30"),
      ex("Seated Calf Raise", "Calves", 6, "5, 10, 15, 20, 25, 30"),
      ex("Triceps Pushdown", "Arms", 6, "30, 25, 20, 15, 10, 5"),
      ex("Lying Dumbbell Triceps Extension", "Arms", 6, "5, 10, 15, 20, 25, 30"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 48 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 7,
    label: "Day 49 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
];

// ---------- WEEK 8 — DTP Extreme (rep-pyramid ladders + supersets) ----------
const week8: Day[] = [
  {
    dayNumber: 1,
    label: "Day 50 — Back & Abs",
    focus: "Back & Abs",
    exercises: [
      ex("Chin-Up", "Back", 5, "20, 15, 10, 10, 5"),
      ex("Underhand Cable Pulldown", "Back", 5, "5, 10, 10, 15, 20"),
      ex("Leverage Iso Row", "Back", 5, "20, 15, 10, 10, 5", "Superset"),
      ex("Cable Reverse Crunch", "Abs", 5, "20, 15, 10, 10, 5", "Superset"),
      ex("Seated Cable Row", "Back", 5, "5, 10, 10, 15, 20"),
      ex("Cable Crunch", "Abs", 5, "5, 10, 10, 15, 20"),
      ex("Bent-Over Barbell Row", "Back", 5, "20, 15, 10, 10, 5", "Superset"),
      ex("Seated Leg Tuck", "Abs", 5, "20 reps to failure", "Superset"),
      ex("Reverse Grip Bent-Over Row", "Back", 5, "5, 10, 10, 15, 20"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 51 — Legs",
    focus: "Legs",
    exercises: [
      ex("Wide-Stance Barbell Squat", "Legs", 5, "30, 25, 20, 15, 10"),
      ex("Narrow-Stance Squat", "Legs", 5, "5, 10, 15, 20, 25"),
      ex("Hack Squat", "Legs", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("Stiff-Legged Barbell Deadlift", "Legs", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("Hack Squat", "Legs", 6, "5, 10, 15, 20, 25, 30"),
      ex("Stiff-Legged Barbell Deadlift", "Legs", 6, "5, 10, 15, 20, 25, 30"),
      ex("Walking Dumbbell Lunge", "Legs", 3, "20 per leg"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 52 — Chest & Calves",
    focus: "Chest & Calves",
    exercises: [
      ex("Incline Dumbbell Press", "Chest", 6, "30, 25, 20, 15, 10, 5"),
      ex("Decline Dumbbell Fly", "Chest", 6, "5, 10, 15, 20, 25, 30"),
      ex("Leverage Chest Press", "Chest", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Single Leg Calf Raise", "Calves", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Butterfly", "Chest", 6, "5, 10, 15, 20, 25, 30"),
      ex("Calf Raise", "Calves", 6, "5, 10, 15, 20, 25, 30"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 4,
    label: "Day 53 — Shoulders",
    focus: "Shoulders",
    exercises: [
      ex("Dumbbell Shoulder Press", "Shoulders", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Upright Cable Row", "Shoulders", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Seated Cable Shoulder Press", "Shoulders", 6, "5, 10, 15, 20, 25, 30"),
      ex("Front Cable Raise", "Shoulders", 6, "5, 10, 15, 20, 25, 30"),
      ex("Side Lateral Raise", "Shoulders", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Cable Rear Delt Fly", "Shoulders", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Side Lateral Raise", "Shoulders", 3, "10, 20, 30"),
      ex("Cable Rear Delt Fly", "Shoulders", 3, "10, 20, 30"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 54 — Triceps, Biceps & Abs",
    focus: "Triceps, Biceps & Abs",
    exercises: [
      ex("EZ-Bar Skullcrusher", "Arms", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Hammer Curl", "Arms", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Barbell Curl", "Arms", 6, "5, 10, 15, 20, 25, 30"),
      ex("Lying Dumbbell Triceps Extension", "Arms", 6, "5, 10, 15, 20, 25, 30"),
      ex("Overhead Cable Curl", "Arms", 3, "30, 20, 10", "Superset"),
      ex("Triceps Pushdown — Rope Attachment", "Arms", 3, "30, 20, 10", "Superset"),
      ex("Cable Preacher Curl", "Arms", 3, "10, 20, 30"),
      ex("Bench Dips", "Arms", 3, "10, 20, 30"),
      ex("Decline Reverse Crunch", "Abs", 6, "30, 25, 20, 15, 10, 5"),
      ex("Exercise Ball Pull-In", "Abs", 3, "10, 20, 30"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 55 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 7,
    label: "Day 56 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
];

// ---------- WEEK 9 — DTP Extreme (rep-pyramid ladders + supersets) ----------
const week9: Day[] = [
  {
    dayNumber: 1,
    label: "Day 57 — Legs & Calves",
    focus: "Legs & Calves",
    exercises: [
      ex("Leg Extension", "Legs", 3, "50, 40, 30"),
      ex("Leg Press", "Legs", 5, "30, 25, 20, 15, 10"),
      ex("Hack Squat", "Legs", 5, "10, 15, 20, 25, 30"),
      ex("Leg Extension", "Legs", 3, "30, 40, 50"),
      ex("Lying Leg Curl", "Legs", 3, "50, 40, 30"),
      ex("Stiff-Legged Barbell Deadlift", "Legs", 5, "30, 25, 20, 15, 10"),
      ex("Seated Leg Curl", "Legs", 5, "10, 15, 20, 25, 30"),
      ex("Seated Calf Raise", "Calves", 5, "30, 25, 20, 15, 10"),
      ex("Standing Calf Raise", "Calves", 5, "10, 15, 20, 25, 30"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 58 — Back & Chest",
    focus: "Back & Chest",
    exercises: [
      ex("Dumbbell Bench Press", "Chest", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("T-Bar Row", "Back", 6, "30, 25, 20, 15, 10, 5", "Superset"),
      ex("Incline Dumbbell Fly", "Chest", 3, "10, 20, 30", "Superset"),
      ex("Bent-Over Barbell Row", "Back", 3, "10, 15, 20", "Superset"),
      ex("Wide-Grip Lat Pulldown", "Back", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("Dips — Chest Version", "Chest", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("Cable Crossover", "Chest", 3, "10, 20, 30", "Superset"),
      ex("Close-Grip Front Lat Pulldown", "Back", 3, "10, 15, 20", "Superset"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 59 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 4,
    label: "Day 60 — Shoulders & Abs",
    focus: "Shoulders & Abs",
    exercises: [
      ex("Side Lateral Raise", "Shoulders", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("Front Plate Raise", "Shoulders", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("Seated Bent-Over Rear Delt Raise", "Shoulders", 5, "10, 15, 20, 25, 30", "Superset"),
      ex("Front Two-Dumbbell Raise (Incline Bench)", "Shoulders", 5, "10, 15, 20, 25, 30", "Superset"),
      ex("Seated Bent-Over Rear Delt Raise", "Shoulders", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("Bent-Knee Hip Raise", "Abs", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("Reverse Machine Fly", "Shoulders", 5, "10, 15, 20, 25, 30", "Superset"),
      ex("Bent-Knee Hip Raise", "Abs", 5, "10, 15, 20, 25, 30", "Superset"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 61 — Biceps & Triceps",
    focus: "Biceps & Triceps",
    exercises: [
      ex("Standing Dumbbell Triceps Extension", "Arms", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("Seated Dumbbell Curl", "Arms", 5, "30, 25, 20, 15, 10", "Superset"),
      ex("Decline EZ-Bar Triceps Extension", "Arms", 5, "10, 15, 20, 25, 30", "Superset"),
      ex("Spider Curl", "Arms", 5, "10, 15, 20, 25, 30", "Superset"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 62 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 7,
    label: "Day 63 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
];

// ---------- WEEK 10 — DTP Extreme (long ladders; some "to 50" runs) ----------
const week10: Day[] = [
  {
    dayNumber: 1,
    label: "Day 64 — Legs & Calves",
    focus: "Legs & Calves",
    exercises: [
      ex("Box Squat", "Legs", 12, "30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30"),
      ex("Leg Extension", "Legs", 3, "50"),
      ex("Hack Squat", "Legs", 12, "30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30"),
      ex("Seated Leg Curl", "Legs", 3, "50"),
      ex("Stiff-Legged Barbell Deadlift", "Legs", 12, "30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30"),
      ex("Single-Leg Calf Raise", "Calves", 12, "30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30"),
    ],
  },
  {
    dayNumber: 2,
    label: "Day 65 — Chest & Triceps",
    focus: "Chest & Triceps",
    exercises: [
      ex("Barbell Incline Bench Press — Medium Grip", "Chest", 6, "30, 25, 20, 15, 10, 5"),
      ex("Barbell Bench Press — Medium Grip", "Chest", 6, "5, 10, 15, 20, 25, 30"),
      ex("Decline Dumbbell Fly", "Chest", 12, "30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30"),
      ex("Incline Dumbbell Fly", "Chest", 6, "5, 10, 15, 20, 25, 30"),
      ex("Triceps Pushdown — Rope Attachment", "Arms", 6, "30, 25, 20, 15, 10, 5"),
      ex("Standing Dumbbell Triceps Extension", "Arms", 6, "5, 10, 15, 20, 25, 30"),
      ex("Push-Ups (Close-Grip & Wide-Hand)", "Chest", 6, "30, 25, 20, 15, 10, 5"),
      ex("Bench Dips", "Arms", 6, "5, 10, 15, 20, 25, 30"),
    ],
  },
  {
    dayNumber: 3,
    label: "Day 66 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 4,
    label: "Day 67 — Back & Biceps",
    focus: "Back & Biceps",
    exercises: [
      ex("V-Bar Pull-Up", "Back", 3, "25, 15, 5", "Alternating Sets"),
      ex("Chin-Up", "Back", 2, "20, 10", "Alternating Sets"),
      ex("Underhand Cable Pulldown", "Back", 3, "5, 10, 15"),
      ex("Close-Grip Front Lat Pulldown", "Back", 3, "20, 25, 30"),
      ex("Reverse Grip Bent-Over Row", "Back", 5, "25, 20, 15, 10, 5"),
      ex("Single-Arm Dumbbell Arc Row", "Back", 5, "25, 20, 15, 10, 5 (per arm)"),
      ex("One-Arm Dumbbell Row", "Back", 5, "5, 10, 15, 20, 25 (per arm)"),
      ex("Preacher Curl", "Arms", 5, "25, 20, 15, 10, 5"),
      ex("One-Arm Dumbbell Preacher Curl", "Arms", 5, "5, 10, 15, 20, 25 (per arm)"),
    ],
  },
  {
    dayNumber: 5,
    label: "Day 68 — Shoulders",
    focus: "Shoulders",
    exercises: [
      ex("Smith Machine Overhead Shoulder Press", "Shoulders", 12, "30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30"),
      ex("Reverse Fly", "Shoulders", 6, "30, 25, 20, 15, 10, 5"),
      ex("Neutral-Grip Reverse Fly", "Shoulders", 6, "5, 10, 15, 20, 25, 30"),
      ex("Side Lateral Raise", "Shoulders", 6, "30, 25, 20, 15, 10, 5"),
      ex("Seated Side Lateral Raise", "Shoulders", 6, "5, 10, 15, 20, 25, 30"),
      ex("Barbell Shrug", "Shoulders", 6, "25, 15, 5, 5, 15, 25"),
    ],
  },
  {
    dayNumber: 6,
    label: "Day 69 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 7,
    label: "Day 70 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
];

// ---------- WEEK 11 — DTP Extreme (giant-set ladders) ----------
const week11: Day[] = [
  {
    dayNumber: 1,
    label: "Day 71 — Legs",
    focus: "Legs",
    exercises: [
      ex("Leg Extension", "Legs", 5, "30", "Giant Set"),
      ex("Leg Press", "Legs", 5, "30, 25, 20, 15, 10", "Giant Set"),
      ex("Hack Squat", "Legs", 5, "30, 25, 20, 10, 15", "Giant Set"),
      ex("Seated Leg Curl", "Legs", 5, "30", "Giant Set"),
      ex("Leg Press", "Legs", 5, "10, 15, 20, 25, 30", "Giant Set"),
      ex("Hack Squat", "Legs", 5, "10, 15, 20, 25, 30", "Giant Set"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 72 — Chest & Triceps",
    focus: "Chest & Triceps",
    exercises: [
      ex("Dumbbell Bench Press", "Chest", 5, "30, 25, 20, 15, 10", "Giant Set"),
      ex("Incline Dumbbell Fly", "Chest", 5, "30, 25, 20, 15, 10", "Giant Set"),
      ex("Cable Crossover", "Chest", 5, "30, 25, 20, 15, 10", "Giant Set"),
      ex("Cable Crossover", "Chest", 5, "10, 15, 20, 25, 30", "Giant Set"),
      ex("Incline Dumbbell Fly", "Chest", 5, "10, 15, 20, 25, 30", "Giant Set"),
      ex("Dumbbell Bench Press", "Chest", 5, "10, 15, 20, 25, 30", "Giant Set"),
      ex("Triceps Pushdown — V-Bar Attachment", "Arms", 5, "30, 25, 20, 15, 10", "Giant Set"),
      ex("Triceps Overhead Extension with Rope", "Arms", 5, "30, 25, 20, 15, 10", "Giant Set"),
      ex("Triceps Pushdown — Rope Attachment", "Arms", 5, "30, 25, 20, 15, 10", "Giant Set"),
      ex("Triceps Pushdown — Rope Attachment", "Arms", 5, "10, 15, 20, 25, 30", "Giant Set"),
      ex("Triceps Overhead Extension with Rope", "Arms", 5, "10, 15, 20, 25, 30", "Giant Set"),
      ex("Triceps Pushdown — V-Bar Attachment", "Arms", 5, "10, 15, 20, 25, 30", "Giant Set"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 73 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 4,
    label: "Day 74 — Back & Biceps",
    focus: "Back & Biceps",
    exercises: [
      ex("Wide-Grip Lat Pulldown", "Back", 4, "25, 20, 15, 10", "Giant Set"),
      ex("Barbell Deadlift", "Back", 4, "25, 20, 15, 10", "Giant Set"),
      ex("Dumbbell Incline Row", "Back", 4, "25, 20, 15, 10", "Giant Set"),
      ex("Dumbbell Incline Row", "Back", 4, "10, 15, 20, 25", "Giant Set"),
      ex("Barbell Deadlift", "Back", 4, "10, 15, 20, 25", "Giant Set"),
      ex("Wide-Grip Lat Pulldown", "Back", 4, "10, 15, 20, 25", "Giant Set"),
      ex("Barbell Curl", "Arms", 4, "25, 20, 15, 10", "Giant Set"),
      ex("Standing Biceps Cable Curl", "Arms", 4, "25, 20, 15, 10", "Giant Set"),
      ex("Lying Close-Grip Bar Curl on High Pulley", "Arms", 4, "25, 20, 15, 10", "Giant Set"),
      ex("Lying Close-Grip Bar Curl on High Pulley", "Arms", 4, "10, 15, 20, 25", "Giant Set"),
      ex("Standing Biceps Cable Curl", "Arms", 4, "10, 15, 20, 25", "Giant Set"),
      ex("Barbell Curl", "Arms", 4, "10, 15, 20, 25", "Giant Set"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 75 — Shoulders & Abs",
    focus: "Shoulders & Abs",
    exercises: [
      ex("Upright Barbell Row", "Shoulders", 5, "30, 25, 20, 15, 10", "Giant Set"),
      ex("Standing Military Press", "Shoulders", 5, "30, 25, 20, 15, 10", "Giant Set"),
      ex("Alternating Deltoid Raise", "Shoulders", 5, "30, 25, 20, 15, 10", "Giant Set"),
      ex("Alternating Deltoid Raise", "Shoulders", 5, "10, 15, 20, 25, 30", "Giant Set"),
      ex("Standing Military Press", "Shoulders", 5, "10, 15, 20, 25, 30", "Giant Set"),
      ex("Upright Barbell Row", "Shoulders", 5, "10, 15, 20, 25, 30", "Giant Set"),
      ex("Seated Calf Raise", "Calves", 6, "30, 20, 10, 10, 20, 30", "Giant Set"),
      ex("Tuck Crunch", "Abs", 6, "to failure", "Giant Set"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 76 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 7,
    label: "Day 77 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
];

// ---------- WEEK 12 — GVT (single-limb ladder supersets) ----------
const week12: Day[] = [
  {
    dayNumber: 1,
    label: "Day 78 — Legs",
    focus: "Legs",
    exercises: [
      ex("Leg Press (Single Leg)", "Legs", 10, "30, 25, 20, 15, 10, 10, 15, 20, 25, 30 (per leg)"),
      ex("Split Squat with Dumbbells", "Legs", 5, "30, 25, 20, 15, 10"),
      ex("Smith Single-Leg Split Squat", "Legs", 5, "30, 25, 20, 15, 10"),
      ex("Calf Press (Single Leg)", "Calves", 5, "30, 25, 20, 15, 10"),
      ex("Standing Calf Raise", "Calves", 5, "10, 15, 20, 25, 30"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 2,
    label: "Day 79 — Chest & Back",
    focus: "Chest & Back",
    exercises: [
      ex("Leverage Chest Press (Single Arm)", "Chest", 10, "30, 25, 20, 15, 10, 10, 15, 20, 25, 30 (per arm)", "Superset"),
      ex("Dumbbell Incline Row (Single Arm)", "Back", 10, "25, 20, 15, 10, 5, 5, 10, 15, 20, 25 (per arm)", "Superset"),
      ex("One-Arm Lat Pulldown", "Back", 6, "25, 15, 5, 5, 15, 25", "Superset"),
      ex("Single-Arm Cable Crossover", "Chest", 6, "25, 15, 5, 5, 15, 25", "Superset"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 3,
    label: "Day 80 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 4,
    label: "Day 81 — Shoulders & Abs",
    focus: "Shoulders & Abs",
    exercises: [
      ex("Dumbbell One-Arm Shoulder Press", "Shoulders", 10, "30, 25, 20, 15, 10, 10, 15, 20, 25, 30 (per arm)", "Superset"),
      ex("One-Arm Side Lateral", "Shoulders", 10, "25, 20, 15, 10, 5, 5, 10, 15, 20, 25 (per arm)", "Superset"),
      ex("Bent-Over Low-Pulley Side Lateral", "Shoulders", 3, "30, 20, 10 (per arm)", "Superset"),
      ex("Cable Reverse Crunch", "Abs", 3, "to absolute failure", "Superset"),
      ex("Bent-Over Low-Pulley Side Lateral", "Shoulders", 3, "10, 20, 30", "Superset"),
      ex("Sit-Up", "Abs", 3, "to absolute failure", "Superset"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 5,
    label: "Day 82 — Biceps & Triceps",
    focus: "Biceps & Triceps",
    exercises: [
      ex("Standing One-Arm Cable Curl", "Arms", 10, "30, 25, 20, 15, 10, 10, 15, 20, 25, 30 (per arm)", "Superset"),
      ex("Standing Bent-Over One-Arm Dumbbell Triceps Extension", "Arms", 10, "25, 20, 15, 10, 5, 5, 10, 15, 20, 25 (per arm)", "Superset"),
      ex("Dumbbell Biceps Curl", "Arms", 6, "30, 20, 10, 10, 20, 30 (per arm)", "Superset"),
      ex("Dumbbell One-Arm Triceps Extension", "Arms", 6, "30, 20, 10, 10, 20, 30 (per arm)", "Superset"),
      intervalCardio,
    ],
  },
  {
    dayNumber: 6,
    label: "Day 83 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
  {
    dayNumber: 7,
    label: "Day 84 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
];

const WEEKS: Record<number, Day[]> = {
  1: week1,
  2: week2,
  3: week3,
  4: week4,
  5: week5,
  6: week6,
  7: week7,
  8: week8,
  9: week9,
  10: week10,
  11: week11,
  12: week12,
};

// Training style/protocol per week (shown as "Week 1 : YT3").
const STYLES: Record<number, string> = {
  1: "YT3",
  2: "Y3T",
  3: "Y3T",
  4: "FST-7",
  5: "GVT",
  6: "HIT",
  7: "DTP Extreme",
  8: "DTP Extreme",
  9: "DTP Extreme",
  10: "DTP Extreme",
  11: "DTP Extreme",
  12: "GVT",
};

async function main() {
  // Clean slate so there is exactly one active plan.
  await prisma.plan.deleteMany({});

  const plan = await prisma.plan.create({
    data: {
      name: PLAN_NAME,
      description:
        "A 12-week muscle-building split. Train each body part on its day, log the sets & reps you actually do against the 8-12 rep scheme, and track your adherence. Include 1-3 warm-up sets per exercise.",
      totalWeeks: 12,
    },
  });

  for (const [weekNum, days] of Object.entries(WEEKS)) {
    const week = await prisma.week.create({
      data: {
        planId: plan.id,
        number: Number(weekNum),
        style: STYLES[Number(weekNum)] ?? null,
      },
    });

    for (const day of days) {
      const workoutDay = await prisma.workoutDay.create({
        data: {
          weekId: week.id,
          dayNumber: day.dayNumber,
          label: day.label,
          focus: day.focus,
          orderIndex: day.dayNumber,
        },
      });

      await prisma.planExercise.createMany({
        data: day.exercises.map((ex, i) => ({
          workoutDayId: workoutDay.id,
          name: ex.name,
          muscle: ex.muscle,
          groupLabel: ex.groupLabel ?? null,
          orderIndex: i,
          warmupSets: ex.warmupSets ?? 0,
          workingSets: ex.workingSets ?? 0,
          repTarget: ex.repTarget,
          isCardio: ex.isCardio ?? false,
        })),
      });
    }
  }

  // Placeholder second program — selectable in the picker now; its weeks and
  // exercises get added later.
  await prisma.plan.create({
    data: {
      name: "6-Week Shortcut to Shred",
      description:
        "A fast-paced 6-week fat-loss & conditioning block. Workouts coming soon.",
      totalWeeks: 6,
    },
  });

  // Demo account advertised on the login screen. Idempotent (upsert) so it
  // survives reseeds, and enrolled in the main plan so the app has context.
  const demoHash = await bcrypt.hash("demo123", 10);
  const demo = await prisma.user.upsert({
    where: { email: "demo@fitplan.com" },
    update: { passwordHash: demoHash },
    create: {
      email: "demo@fitplan.com",
      name: "Demo Athlete",
      passwordHash: demoHash,
      unit: "kg",
      goal: "Build muscle",
      onboardedAt: new Date(),
    },
  });
  await prisma.enrollment.upsert({
    where: { userId_planId: { userId: demo.id, planId: plan.id } },
    update: { status: "active" },
    create: { userId: demo.id, planId: plan.id, status: "active" },
  });

  const exCount = await prisma.planExercise.count();
  console.log(
    `Seeded "${PLAN_NAME}" + 1 placeholder plan: ${Object.keys(WEEKS).length} week(s), ${exCount} exercises across ${week1.length} days.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
