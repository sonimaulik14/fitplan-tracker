// Idempotent, non-destructive seed. It NEVER deletes plans, weeks or days
// wholesale: Enrollment -> WorkoutSession -> SetEntry all cascade off Plan,
// so a plan.deleteMany() here would wipe every user's logged history on a
// live database. Instead, existing rows are matched in place and updated to
// the program data; the only deletions are individual exercises that dropped
// out of the program data AND have zero logged sets.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PROGRAMS } from "./program-data";
import type { Day, ProgramDef } from "./program-data";

const prisma = new PrismaClient();

type Stats = {
  plans: number;
  weeks: number;
  days: number;
  exCreated: number;
  exUpdated: number;
  exUnchanged: number;
  exDeleted: number;
  exKept: number;
};

async function syncDay(weekId: string, day: Day, stats: Stats) {
  // WorkoutDay has no natural unique key — match by (weekId, dayNumber).
  let workoutDay = await prisma.workoutDay.findFirst({
    where: { weekId, dayNumber: day.dayNumber },
  });
  const dayFields = {
    label: day.label,
    focus: day.focus,
    orderIndex: day.dayNumber,
  };
  if (!workoutDay) {
    workoutDay = await prisma.workoutDay.create({
      data: { weekId, dayNumber: day.dayNumber, ...dayFields },
    });
  } else if (
    workoutDay.label !== dayFields.label ||
    workoutDay.focus !== dayFields.focus ||
    workoutDay.orderIndex !== dayFields.orderIndex
  ) {
    workoutDay = await prisma.workoutDay.update({
      where: { id: workoutDay.id },
      data: dayFields,
    });
  }
  stats.days++;

  const existing = await prisma.planExercise.findMany({
    where: { workoutDayId: workoutDay.id },
    orderBy: { orderIndex: "asc" },
    include: { _count: { select: { setEntries: true } } },
  });

  // PlanExercise has no unique key — match by (workoutDayId, name). A day can
  // prescribe the same movement twice (DTP ladders, giant sets), so pair the
  // i-th occurrence of a name in the data with the i-th existing row of that
  // name in orderIndex order.
  const pool = new Map<string, typeof existing>();
  for (const row of existing) {
    const list = pool.get(row.name);
    if (list) list.push(row);
    else pool.set(row.name, [row]);
  }

  for (const [i, def] of day.exercises.entries()) {
    const fields = {
      muscle: def.muscle,
      groupLabel: def.groupLabel ?? null,
      orderIndex: i,
      warmupSets: def.warmupSets ?? 0,
      workingSets: def.workingSets ?? 0,
      repTarget: def.repTarget,
      isCardio: def.isCardio ?? false,
    };
    const match = pool.get(def.name)?.shift();
    if (!match) {
      await prisma.planExercise.create({
        data: { workoutDayId: workoutDay.id, name: def.name, ...fields },
      });
      stats.exCreated++;
    } else if (
      match.muscle !== fields.muscle ||
      match.groupLabel !== fields.groupLabel ||
      match.orderIndex !== fields.orderIndex ||
      match.warmupSets !== fields.warmupSets ||
      match.workingSets !== fields.workingSets ||
      match.repTarget !== fields.repTarget ||
      match.isCardio !== fields.isCardio
    ) {
      await prisma.planExercise.update({
        where: { id: match.id },
        data: fields,
      });
      stats.exUpdated++;
    } else {
      stats.exUnchanged++;
    }
  }

  // Whatever is left in the pool exists in the DB but not in the program
  // data. Deleting a PlanExercise cascades the user's SetEntry logs, so only
  // remove rows nobody has ever logged against; warn about (and keep) the rest.
  for (const leftovers of pool.values()) {
    for (const row of leftovers) {
      if (row._count.setEntries === 0) {
        await prisma.planExercise.delete({ where: { id: row.id } });
        stats.exDeleted++;
      } else {
        console.warn(
          `KEPT "${row.name}" on "${day.label}": not in the program data but has ` +
            `${row._count.setEntries} logged set(s) — deleting would erase user history.`
        );
        stats.exKept++;
      }
    }
  }
}

async function syncProgram(program: ProgramDef, stats: Stats) {
  // Plan.name has no unique constraint — match by name, create if missing.
  const found = await prisma.plan.findFirst({ where: { name: program.name } });
  const planFields = {
    description: program.description,
    totalWeeks: program.totalWeeks,
  };
  const plan = found
    ? await prisma.plan.update({ where: { id: found.id }, data: planFields })
    : await prisma.plan.create({ data: { name: program.name, ...planFields } });
  stats.plans++;

  for (const [num, days] of Object.entries(program.weeks)) {
    const number = Number(num);
    const week = await prisma.week.upsert({
      where: { planId_number: { planId: plan.id, number } },
      update: { style: program.styles[number] ?? null },
      create: { planId: plan.id, number, style: program.styles[number] ?? null },
    });
    stats.weeks++;

    for (const day of days) await syncDay(week.id, day, stats);
  }
  return plan;
}

async function main() {
  const stats: Stats = {
    plans: 0,
    weeks: 0,
    days: 0,
    exCreated: 0,
    exUpdated: 0,
    exUnchanged: 0,
    exDeleted: 0,
    exKept: 0,
  };

  const planIdsByName = new Map<string, string>();
  for (const program of PROGRAMS) {
    const plan = await syncProgram(program, stats);
    planIdsByName.set(program.name, plan.id);
  }

  // PROGRAMS[0] is the main (fully seeded) plan the demo account enrolls in.
  const mainPlanId = planIdsByName.get(PROGRAMS[0].name)!;

  // Demo account advertised on the login screen. Idempotent (upsert) so it
  // survives reseeds, and enrolled in the main plan so the app has context.
  const DEMO_EMAIL = "demo@vajra.fit";
  // One-time migration from the pre-rebrand demo address (keeps its history).
  const legacyDemo = await prisma.user.findUnique({
    where: { email: "demo@fitplan.com" },
  });
  if (legacyDemo && !(await prisma.user.findUnique({ where: { email: DEMO_EMAIL } }))) {
    await prisma.user.update({
      where: { id: legacyDemo.id },
      data: { email: DEMO_EMAIL },
    });
  }
  const demoHash = await bcrypt.hash("demo123", 10);
  const demo = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash: demoHash },
    create: {
      email: DEMO_EMAIL,
      name: "Demo Athlete",
      passwordHash: demoHash,
      unit: "kg",
      goal: "Build muscle",
      onboardedAt: new Date(),
    },
  });
  const demoEnrollment = await prisma.enrollment.findFirst({
    where: { userId: demo.id, planId: mainPlanId },
    orderBy: { cycle: "desc" },
  });
  if (demoEnrollment) {
    await prisma.enrollment.update({
      where: { id: demoEnrollment.id },
      data: { status: "active" },
    });
  } else {
    await prisma.enrollment.create({
      data: { userId: demo.id, planId: mainPlanId, status: "active" },
    });
  }

  console.log(
    `Seeded ${stats.plans} plan(s): ${stats.weeks} week(s), ${stats.days} day(s). ` +
      `Exercises: ${stats.exCreated} created, ${stats.exUpdated} updated, ` +
      `${stats.exUnchanged} unchanged, ${stats.exDeleted} removed, ` +
      `${stats.exKept} kept despite dropping out of the data (had logged sets).`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
