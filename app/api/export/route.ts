import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { weightNum, type Unit } from "@/lib/ui";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const entries = await prisma.setEntry.findMany({
    where: { session: { enrollment: { userId: user.id } } },
    include: {
      planExercise: true,
      session: { include: { workoutDay: { include: { week: true } } } },
    },
    orderBy: [{ session: { performedDate: "asc" } }],
  });

  const unit = (user.unit as Unit) ?? "kg";
  const header = [
    "date",
    "week",
    "day",
    "exercise",
    "muscle",
    "set",
    "type",
    `weight_${unit}`,
    "reps",
    "rpe",
    "done",
    "target",
  ];
  const lines = [header.join(",")];
  for (const e of entries) {
    lines.push(
      [
        e.session.performedDate.toISOString().slice(0, 10),
        e.session.workoutDay.week.number,
        e.session.workoutDay.focus,
        e.planExercise.name,
        e.planExercise.muscle,
        e.setNumber,
        e.setType,
        e.weight == null ? "" : weightNum(e.weight, unit),
        e.reps ?? "",
        e.rpe ?? "",
        e.done ? "yes" : "no",
        e.planExercise.repTarget,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fitplan-export.csv"`,
    },
  });
}
