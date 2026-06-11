// One-off, non-destructive: adds Week 4 (FST-7) to the live active plan.
// Safe to re-run — it skips if Week 4 already exists. Does NOT touch other data.
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

const intervalCardio: Ex = {
  name: "Cardio",
  muscle: "Cardio",
  workingSets: 1,
  repTarget: "15-min intervals: 3 min easy / 1 min hard",
  isCardio: true,
};

const ex = (
  name: string,
  muscle: string,
  workingSets: number,
  repTarget: string,
  groupLabel?: string
): Ex => ({ name, muscle, workingSets, repTarget, groupLabel });

const restDay: Ex = {
  name: "Cardio (active rest)",
  muscle: "Cardio",
  workingSets: 1,
  repTarget: "Light cardio / active recovery",
  isCardio: true,
};

const week4 = [
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
    exercises: [restDay],
  },
  {
    dayNumber: 7,
    label: "Day 28 — Active Rest & Cardio",
    focus: "Active Rest & Cardio",
    exercises: [restDay],
  },
];

async function main() {
  const plan = await prisma.plan.findFirst();
  if (!plan) throw new Error("No plan found — run the seed first.");

  const existing = await prisma.week.findFirst({
    where: { planId: plan.id, number: 4 },
  });
  if (existing) {
    console.log("Week 4 already exists — nothing to do.");
    return;
  }

  const week = await prisma.week.create({
    data: { planId: plan.id, number: 4, style: "FST-7" },
  });

  for (const day of week4) {
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

  const exCount = week4.reduce((n, d) => n + d.exercises.length, 0);
  console.log(`Added Week 4 (FST-7): ${week4.length} days, ${exCount} exercises.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
