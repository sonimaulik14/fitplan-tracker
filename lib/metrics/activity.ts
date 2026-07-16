import { prisma } from "../prisma";
import { ymd, streakLength } from "../date";

/** Streak + calendar heatmap built from logged training activity. */
export async function getActivity(userId: string, days = 119) {
  const sessions = await prisma.workoutSession.findMany({
    where: { enrollment: { userId } },
    include: { setEntries: true },
  });

  const byDate = new Map<string, number>();
  for (const s of sessions) {
    const done = s.setEntries.filter((e) => e.done).length;
    if (done === 0) continue;
    const key = ymd(s.performedDate);
    byDate.set(key, (byDate.get(key) ?? 0) + done);
  }

  const activeDates = [...byDate.keys()].sort();
  const totalActiveDays = activeDates.length;

  // longest streak (consecutive calendar days)
  const dayMs = 86400000;
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of activeDates) {
    const t = new Date(d + "T00:00:00").getTime();
    run = prev !== null && t - prev === dayMs ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }

  // current streak (consecutive days ending today or yesterday), DST-safe
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = streakLength(new Set(byDate.keys()));

  // this week (last 7 days) active count
  let thisWeek = 0;
  for (let i = 0; i < 7; i++) {
    if (byDate.has(ymd(new Date(today.getTime() - i * dayMs)))) thisWeek += 1;
  }

  // heatmap grid for the last `days` days, aligned to weeks (Sun..Sat columns)
  const maxCount = Math.max(1, ...byDate.values());
  const grid: { date: string; count: number; level: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(today.getTime() - i * dayMs);
    const key = ymd(dt);
    const count = byDate.get(key) ?? 0;
    const level =
      count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4));
    grid.push({ date: key, count, level });
  }

  return { current, longest, totalActiveDays, thisWeek, grid };
}

export type ActivitySummary = Awaited<ReturnType<typeof getActivity>>;

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
};

type ProgressLike = {
  completedWorkouts: number;
  doneSetsTotal: number;
  prs: { length: number }[] | { length: number };
  repQuality: number;
  workingSetsDone: number;
  days: { status: string; doneSets: number; prescribedSets: number }[];
};

/** Derive badges purely from already-computed progress + activity. */
export function buildAchievements(
  p: ProgressLike,
  a: ActivitySummary,
  prCount: number
): Achievement[] {
  const perfectDay = p.days.some(
    (d) => d.prescribedSets > 0 && d.doneSets >= d.prescribedSets
  );
  const trainingDays = p.days.filter(
    (d) => d.prescribedSets > 0
  ).length;
  const trainingDone = p.days.filter(
    (d) => d.status === "completed" && d.prescribedSets > 0
  ).length;

  return [
    {
      id: "first",
      title: "First Step",
      desc: "Complete your first workout",
      icon: "🎯",
      unlocked: p.completedWorkouts >= 1,
    },
    {
      id: "sets25",
      title: "Grinder",
      desc: "Log 25 sets",
      icon: "⚙️",
      unlocked: p.doneSetsTotal >= 25,
    },
    {
      id: "sets100",
      title: "Century",
      desc: "Log 100 sets",
      icon: "💯",
      unlocked: p.doneSetsTotal >= 100,
    },
    {
      id: "pr",
      title: "Record Breaker",
      desc: "Log your first weighted PR",
      icon: "🏋️",
      unlocked: prCount >= 1,
    },
    {
      id: "streak3",
      title: "On a Roll",
      desc: "3-day training streak",
      icon: "🔥",
      unlocked: a.longest >= 3,
    },
    {
      id: "streak7",
      title: "Unstoppable",
      desc: "7-day training streak",
      icon: "⚡",
      unlocked: a.longest >= 7,
    },
    {
      id: "perfect",
      title: "Flawless",
      desc: "Finish every set of a workout",
      icon: "✨",
      unlocked: perfectDay,
    },
    {
      id: "repmaster",
      title: "On Target",
      desc: "80%+ rep quality over 20+ sets",
      icon: "🎯",
      unlocked: p.repQuality >= 80 && p.workingSetsDone >= 20,
    },
    {
      id: "week1",
      title: "Week One Done",
      desc: "Complete all training days in a week",
      icon: "🏆",
      unlocked: trainingDays > 0 && trainingDone >= trainingDays,
    },
  ];
}
