// One-off, non-destructive: adds Week 10 and Week 11 (both DTP Extreme) to the
// live plan. Safe to re-run — skips any week that already exists. Does NOT touch
// other data.
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

const TO_ADD: { number: number; style: string; days: Day[] }[] = [
  { number: 10, style: "DTP Extreme", days: week10 },
  { number: 11, style: "DTP Extreme", days: week11 },
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
    console.log(`Added Week ${w.number} (${w.style}): ${w.days.length} days, ${exCount} exercises.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
