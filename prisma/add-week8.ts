// One-off, non-destructive: adds Week 8 (DTP Extreme) to the live plan.
// Safe to re-run — skips if Week 8 already exists. Does NOT touch other data.
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

async function main() {
  const plan = await prisma.plan.findFirst();
  if (!plan) throw new Error("No plan found — run the seed first.");

  const existing = await prisma.week.findFirst({
    where: { planId: plan.id, number: 8 },
  });
  if (existing) {
    console.log("Week 8 already exists — nothing to do.");
    return;
  }

  const week = await prisma.week.create({
    data: { planId: plan.id, number: 8, style: "DTP Extreme" },
  });

  for (const day of week8) {
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

  const exCount = week8.reduce((n, d) => n + d.exercises.length, 0);
  console.log(`Added Week 8 (DTP Extreme): ${week8.length} days, ${exCount} exercises.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
