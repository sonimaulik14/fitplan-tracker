// One-off, non-destructive: adds Week 7 (DTP Extreme) to the live plan.
// Safe to re-run — skips if Week 7 already exists. Does NOT touch other data.
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
      ex("Barbell Incline Bench Press — Medium Grip", "Chest", 6, "5, 10, 15, 20, 25, 30"),
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

async function main() {
  const plan = await prisma.plan.findFirst();
  if (!plan) throw new Error("No plan found — run the seed first.");

  const existing = await prisma.week.findFirst({
    where: { planId: plan.id, number: 7 },
  });
  if (existing) {
    console.log("Week 7 already exists — nothing to do.");
    return;
  }

  const week = await prisma.week.create({
    data: { planId: plan.id, number: 7, style: "DTP Extreme" },
  });

  for (const day of week7) {
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

  const exCount = week7.reduce((n, d) => n + d.exercises.length, 0);
  console.log(`Added Week 7 (DTP Extreme): ${week7.length} days, ${exCount} exercises.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
