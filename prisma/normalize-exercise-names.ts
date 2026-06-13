// One-off, non-destructive: collapses near-duplicate exercise names that were
// spelled inconsistently across weeks. They slugify to the same URL, so the
// /exercise route conflated them and per-exercise history split across spellings.
// Renaming to one canonical spelling fixes routing AND merges the history
// (set entries reference the exercise, history aggregates by name). Idempotent.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// wrong spelling -> canonical spelling
const RENAMES: Record<string, string> = {
  "Leverage ISO Row": "Leverage Iso Row",
  "Barbell Incline Bench Press Medium-Grip":
    "Barbell Incline Bench Press — Medium Grip",
  "Single Leg Calf Raise": "Single-Leg Calf Raise",
};

async function main() {
  let exUpdated = 0;
  let swapUpdated = 0;
  for (const [from, to] of Object.entries(RENAMES)) {
    const ex = await prisma.planExercise.updateMany({
      where: { name: from },
      data: { name: to },
    });
    const sw = await prisma.exerciseSwap.updateMany({
      where: { name: from },
      data: { name: to },
    });
    exUpdated += ex.count;
    swapUpdated += sw.count;
    if (ex.count || sw.count)
      console.log(`"${from}" -> "${to}"  (${ex.count} exercises, ${sw.count} swaps)`);
  }
  console.log(
    `\nDone. Renamed ${exUpdated} plan exercises, ${swapUpdated} swaps. ${
      exUpdated + swapUpdated === 0 ? "(already normalized)" : ""
    }`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
