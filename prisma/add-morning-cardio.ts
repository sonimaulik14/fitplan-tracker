// One-off, non-destructive: adds a "Morning Cardio" session to every day of the
// 12-Week Muscle Builder, so each day has cardio twice — morning + the existing
// end-of-workout session. Safe to re-run: skips any day that already has it.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLAN_NAME = "12-Week Muscle Builder";
const MORNING_CARDIO = {
  name: "Morning Cardio",
  muscle: "Cardio",
  workingSets: 1,
  repTarget: "20–30 min steady-state (fasted)",
  isCardio: true,
};

async function main() {
  const plan = await prisma.plan.findFirst({
    where: { name: PLAN_NAME },
    include: {
      weeks: {
        orderBy: { number: "asc" },
        include: { days: { include: { exercises: true } } },
      },
    },
  });
  if (!plan) throw new Error(`Plan "${PLAN_NAME}" not found`);

  let added = 0;
  let skipped = 0;
  for (const week of plan.weeks) {
    for (const day of week.days) {
      if (day.exercises.some((e) => e.name === MORNING_CARDIO.name)) {
        skipped++;
        continue;
      }
      // Place it first on the day (lowest orderIndex) — morning comes before
      // the workout and its end-of-session cardio.
      const minOrder = day.exercises.reduce(
        (m, e) => Math.min(m, e.orderIndex),
        0
      );
      await prisma.planExercise.create({
        data: {
          workoutDayId: day.id,
          name: MORNING_CARDIO.name,
          muscle: MORNING_CARDIO.muscle,
          orderIndex: minOrder - 1,
          warmupSets: 0,
          workingSets: MORNING_CARDIO.workingSets,
          repTarget: MORNING_CARDIO.repTarget,
          isCardio: true,
        },
      });
      added++;
    }
  }
  console.log(
    `Morning Cardio — added to ${added} day(s), skipped ${skipped} (already had it).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
