// One-off, non-destructive: adds Week 5 (GVT) and Week 6 to the live plan.
// Safe to re-run — skips any week that already exists. Does NOT touch other data.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Ex = {
  name: string;
  muscle: string;
  workingSets?: number;
  repTarget: string;
  groupLabel?: string;
  isCardio?: boolean;
};
type Day = { dayNumber: number; label: string; focus: string; exercises: Ex[] };

const intervalCardio: Ex = {
  name: "Cardio",
  muscle: "Cardio",
  workingSets: 1,
  repTarget: "15-min intervals: 3 min easy / 1 min hard",
  isCardio: true,
};
const restDay: Ex = {
  name: "Cardio (active rest)",
  muscle: "Cardio",
  workingSets: 1,
  repTarget: "Light cardio / active recovery",
  isCardio: true,
};
const ex = (
  name: string,
  muscle: string,
  workingSets: number,
  repTarget: string,
  groupLabel?: string
): Ex => ({ name, muscle, workingSets, repTarget, groupLabel });

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

const TO_ADD: { number: number; style: string | null; days: Day[] }[] = [
  { number: 5, style: "GVT", days: week5 },
  { number: 6, style: "HIT", days: week6 },
];

async function main() {
  const plan = await prisma.plan.findFirst();
  if (!plan) throw new Error("No plan found — run the seed first.");

  for (const w of TO_ADD) {
    const existing = await prisma.week.findFirst({
      where: { planId: plan.id, number: w.number },
    });
    if (existing) {
      console.log(`Week ${w.number} already exists — skipping.`);
      continue;
    }
    const week = await prisma.week.create({
      data: { planId: plan.id, number: w.number, style: w.style },
    });
    for (const day of w.days) {
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
        data: day.exercises.map((e, i) => ({
          workoutDayId: workoutDay.id,
          name: e.name,
          muscle: e.muscle,
          groupLabel: e.groupLabel ?? null,
          orderIndex: i,
          warmupSets: 0,
          workingSets: e.workingSets ?? 0,
          repTarget: e.repTarget,
          isCardio: e.isCardio ?? false,
        })),
      });
    }
    const exCount = w.days.reduce((n, d) => n + d.exercises.length, 0);
    console.log(
      `Added Week ${w.number}${w.style ? ` (${w.style})` : ""}: ${w.days.length} days, ${exCount} exercises.`
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
