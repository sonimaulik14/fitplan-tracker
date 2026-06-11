import { getCurrentUser } from "@/lib/auth";
import { getActivePlan } from "@/lib/metrics";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const plan = await getActivePlan();
  if (!plan) return Response.json({ exercises: [], days: [], weeks: [] });

  const exMap = new Map<string, string>(); // name -> muscle
  const days: { id: string; focus: string; week: number; day: number }[] = [];
  const weeks: { number: number; style: string | null }[] = [];

  for (const w of plan.weeks) {
    weeks.push({ number: w.number, style: w.style });
    for (const d of w.days) {
      days.push({
        id: d.id,
        focus: d.focus,
        week: w.number,
        day: (w.number - 1) * 7 + d.dayNumber,
      });
      for (const ex of d.exercises) {
        if (!ex.isCardio && !exMap.has(ex.name)) exMap.set(ex.name, ex.muscle);
      }
    }
  }

  return Response.json({
    exercises: [...exMap.entries()].map(([name, muscle]) => ({ name, muscle })),
    days,
    weeks,
  });
}
