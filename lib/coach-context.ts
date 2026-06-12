import "server-only";
import {
  getProgress,
  getPlateaus,
  getActivity,
  getBodyweightSeries,
} from "./metrics";
import { weightNum, type Unit } from "./ui";

export type CoachProfile = {
  name: string;
  unit: Unit;
  goal: string | null;
  goalWeightKg: number | null;
  calorieGoal: number | null;
  proteinGoal: number | null;
};

const n = (v: number) => Math.round(v).toLocaleString("en-US");

/**
 * Build a compact, token-efficient brief of the athlete's real training state
 * for the AI coach's system prompt. Everything here comes straight from the
 * same metrics the rest of the app shows, converted to the user's display unit.
 */
export async function buildCoachContext(
  userId: string,
  profile: CoachProfile
): Promise<string> {
  const unit = profile.unit;
  const [progress, plateaus, activity, bw] = await Promise.all([
    getProgress(userId),
    getPlateaus(userId),
    getActivity(userId),
    getBodyweightSeries(userId),
  ]);

  const L: string[] = [];
  L.push(`Athlete: ${profile.name}. Units: ${unit}.`);
  if (profile.goal) L.push(`Stated goal: ${profile.goal}.`);
  if (profile.goalWeightKg != null)
    L.push(`Goal bodyweight: ${weightNum(profile.goalWeightKg, unit)} ${unit}.`);
  if (profile.calorieGoal != null)
    L.push(
      `Nutrition targets: ${profile.calorieGoal} kcal, ${
        profile.proteinGoal ?? "—"
      } g protein/day.`
    );

  if (bw.length) {
    const latest = bw[bw.length - 1].weight;
    const first = bw[0].weight;
    const delta = weightNum(latest - first, unit);
    L.push(
      `Bodyweight: ${weightNum(latest, unit)} ${unit} (latest of ${
        bw.length
      } weigh-ins, ${delta >= 0 ? "+" : ""}${delta} ${unit} since first).`
    );
  }

  if (!progress || !progress.enrolled) {
    L.push(
      "Not enrolled in a program yet — they're choosing one. Encourage them to start, and help them pick based on their goal."
    );
    return L.join("\n");
  }

  L.push(
    `Program: "${progress.plan.name}" — ${progress.totalWeeks} weeks (${progress.weeksSeeded} built out).`
  );

  const next = progress.days.find((d) => d.status !== "completed");
  if (next) {
    const wk = progress.weekly.find((w) => w.weekNumber === next.weekNumber);
    L.push(
      `Current position: Week ${next.weekNumber}, next workout "${next.focus}" (${next.status}).` +
        (wk?.style ? ` This block's protocol/style: ${wk.style}.` : "")
    );
  } else {
    L.push("They have completed every built-out day of the program.");
  }

  L.push(
    `Adherence: ${progress.workoutAdherence}% of workouts completed, ${progress.setAdherence}% of prescribed sets logged, rep-quality ${progress.repQuality}% (working sets that hit the target reps).`
  );
  L.push(
    `Training streak: ${activity.current} day current, ${activity.longest} day longest, ${activity.thisWeek} active day(s) in the last 7.`
  );
  L.push(`Total volume logged: ${n(weightNum(progress.totalVolume, unit))} ${unit}.`);

  const muscles = Object.entries(progress.volumeByMuscle)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (muscles.length)
    L.push(
      `Volume by muscle (${unit}): ` +
        muscles.map(([m, v]) => `${m} ${n(weightNum(v, unit))}`).join(", ") +
        "."
    );

  if (progress.prs.length) {
    L.push(
      "Top lifts (best sets): " +
        progress.prs
          .slice(0, 6)
          .map(
            (p) => `${p.name} ${weightNum(p.maxWeight, unit)}${unit}×${p.repsAtMax}`
          )
          .join("; ") +
        "."
    );
  }

  if (plateaus.length) {
    L.push(
      "STALLED lifts (no est-1RM progress in last 3+ sessions): " +
        plateaus
          .slice(0, 6)
          .map(
            (p) =>
              `${p.name} (${p.muscle}) — stalled ${p.sessionsStalled} sessions around ${weightNum(
                p.bestKg,
                unit
              )}${unit} est-1RM; last top set ${weightNum(p.recentTopKg, unit)}${unit}×${p.recentReps}; prescribed reps ${p.repTarget}`
          )
          .join("; ") +
        "."
    );
  } else {
    L.push("No stalled lifts detected — progression is on track.");
  }

  return L.join("\n");
}
