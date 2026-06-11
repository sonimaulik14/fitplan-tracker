// One-off, non-destructive: adds Week 12 (GVT) to the live plan — the final week.
// Safe to re-run — skips if Week 12 already exists. Does NOT touch other data.
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

async function main() {
  const plan = await prisma.plan.findFirst();
  if (!plan) throw new Error("No plan found — run the seed first.");

  const existing = await prisma.week.findFirst({
    where: { planId: plan.id, number: 12 },
  });
  if (existing) {
    console.log("Week 12 already exists — nothing to do.");
    return;
  }

  const week = await prisma.week.create({
    data: { planId: plan.id, number: 12, style: "GVT" },
  });

  for (const day of week12) {
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

  const exCount = week12.reduce((n, d) => n + d.exercises.length, 0);
  console.log(`Added Week 12 (GVT): ${week12.length} days, ${exCount} exercises. Program complete!`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
