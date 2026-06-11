// One-off, non-destructive: adds Week 9 (DTP Extreme) to the live plan.
// Safe to re-run — skips if Week 9 already exists. Does NOT touch other data.
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

async function main() {
  const plan = await prisma.plan.findFirst();
  if (!plan) throw new Error("No plan found — run the seed first.");

  const existing = await prisma.week.findFirst({
    where: { planId: plan.id, number: 9 },
  });
  if (existing) {
    console.log("Week 9 already exists — nothing to do.");
    return;
  }

  const week = await prisma.week.create({
    data: { planId: plan.id, number: 9, style: "DTP Extreme" },
  });

  for (const day of week9) {
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

  const exCount = week9.reduce((n, d) => n + d.exercises.length, 0);
  console.log(`Added Week 9 (DTP Extreme): ${week9.length} days, ${exCount} exercises.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
