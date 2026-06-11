import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProgress } from "@/lib/metrics";

// Resolves to the user's next unfinished training day and redirects there.
// Used by the bottom-nav "Start workout" FAB so it's always one tap away.
export default async function NextWorkoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const p = await getProgress(user.id);
  if (!p || !p.enrolled) redirect("/dashboard");

  const next =
    p.days.find(
      (d) => d.status !== "completed" && !d.focus.toLowerCase().includes("rest")
    ) ??
    p.days.find((d) => d.status !== "completed") ??
    p.days[0];

  redirect(next ? `/workout/${next.dayId}` : "/dashboard");
}
