import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProgress, getActivity } from "@/lib/metrics";
import { weightNum, kgToUnit, type Unit } from "@/lib/ui";
import WrappedStory, { type WrappedStats } from "@/app/components/WrappedStory";

export const metadata = { title: "12-Week Wrapped" };

export default async function WrappedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;

  const [p, activity] = await Promise.all([
    getProgress(user.id),
    getActivity(user.id),
  ]);
  if (!p || !p.enrolled) redirect("/progress");

  // Top muscle by volume.
  let topMuscle: WrappedStats["topMuscle"] = null;
  for (const [name, vol] of Object.entries(p.volumeByMuscle)) {
    if (!topMuscle || vol > topMuscle.volume)
      topMuscle = { name, volume: kgToUnit(vol, unit) };
  }

  // Top PR (heaviest lift).
  const pr = p.prs[0];
  const topPR = pr
    ? { name: pr.name, weight: weightNum(pr.maxWeight, unit), reps: pr.repsAtMax }
    : null;

  // Favourite style by total volume.
  const styleVol = new Map<string, number>();
  for (const w of p.weekly)
    if (w.style) styleVol.set(w.style, (styleVol.get(w.style) ?? 0) + w.volume);
  let topStyle: WrappedStats["topStyle"] = null;
  for (const [style, vol] of styleVol)
    if (!topStyle || vol > topStyle.volume) topStyle = { style, volume: vol };

  const stats: WrappedStats = {
    volume: Math.round(kgToUnit(p.totalVolume, unit)),
    unit,
    workouts: p.completedWorkouts,
    prescribedWorkouts: p.prescribedWorkouts,
    sets: p.doneSetsTotal,
    activeDays: activity.totalActiveDays,
    longestStreak: activity.longest,
    weeksDone: p.weekly.filter((w) => w.completed).length,
    totalWeeks: p.totalWeeks,
    adherence: p.workoutAdherence,
    repQuality: p.repQuality,
    topMuscle,
    topPR,
    topStyle,
  };

  return <WrappedStory stats={stats} />;
}
