import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLastTimeByExercise, getSwaps } from "@/lib/metrics";
import { termInfo, muscleStyle, type Unit } from "@/lib/ui";
import { getPhoto } from "@/lib/unsplash";
import NavBar from "@/app/components/NavBar";
import { FocusGlyph } from "@/app/components/icons";
import WorkoutLogger, { type LoggerExercise } from "@/app/components/WorkoutLogger";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const day = await prisma.workoutDay.findUnique({
    where: { id: dayId },
    include: {
      week: true,
      exercises: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!day) notFound();

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, planId: day.week.planId },
  });
  if (!enrollment) redirect("/dashboard");

  const session = await prisma.workoutSession.findUnique({
    where: {
      enrollmentId_workoutDayId: {
        enrollmentId: enrollment.id,
        workoutDayId: day.id,
      },
    },
    include: { setEntries: true },
  });

  const [lastTime, swaps] = await Promise.all([
    getLastTimeByExercise(user.id, day.week.planId, day.id),
    getSwaps(user.id, day.week.planId),
  ]);

  const entryMap = new Map(
    (session?.setEntries ?? []).map((e) => [`${e.planExerciseId}:${e.setNumber}`, e])
  );

  const exercises: LoggerExercise[] = day.exercises.map((ex) => {
    const total = ex.isCardio ? 1 : ex.warmupSets + ex.workingSets || 1;
    const rows = Array.from({ length: total }, (_, i) => {
      const setNumber = i + 1;
      const setType = ex.isCardio
        ? "cardio"
        : setNumber <= ex.warmupSets
          ? "warmup"
          : "work";
      const existing = entryMap.get(`${ex.id}:${setNumber}`);
      return {
        planExerciseId: ex.id,
        setNumber,
        setType,
        weight: existing?.weight ?? null,
        reps: existing?.reps ?? null,
        rpe: existing?.rpe ?? null,
        done: existing?.done ?? false,
      };
    });
    const effectiveName = swaps.get(ex.id) ?? ex.name;
    const prev = lastTime[effectiveName];
    return {
      id: ex.id,
      name: effectiveName,
      originalName: ex.name,
      swapped: effectiveName !== ex.name,
      muscle: ex.muscle,
      groupLabel: ex.groupLabel,
      repTarget: ex.repTarget,
      isCardio: ex.isCardio,
      warmupSets: ex.warmupSets,
      workingSets: ex.workingSets,
      lastTime: prev ? { weight: prev.weight, reps: prev.reps } : null,
      rows,
    };
  });

  // Resolve a live photo per muscle group (cached) and attach to each exercise.
  const muscleKeys = [...new Set(exercises.map((e) => muscleStyle(e.muscle).key))];
  const photoByKey = new Map<string, string>();
  await Promise.all(
    muscleKeys.map(async (k) => {
      const p = await getPhoto(`hero:${k}`);
      photoByKey.set(k, p.url);
    })
  );
  for (const e of exercises) e.photoUrl = photoByKey.get(muscleStyle(e.muscle).key);

  const weekStyleInfo = day.week.style ? termInfo(day.week.style) : null;

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-solid py-1.5 pl-2 pr-3.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:border-border-strong transition-colors"
        >
          <ChevronLeft size={16} /> Dashboard
        </Link>
        <div className="mt-5 mb-7 flex items-start gap-4 animate-fade-up">
          <span className="grid place-items-center w-14 h-14 rounded-2xl bg-surface-2 border border-border shrink-0">
            <FocusGlyph focus={day.focus} size={28} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2 text-sm">
              <span className="font-semibold text-foreground/85">
                Week {day.week.number}
              </span>
              {day.week.style && (
                <span className="inline-flex items-center rounded-md border border-accent/40 bg-surface-solid px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">
                  {day.week.style}
                </span>
              )}
              <span className="text-border-strong">·</span>
              <span className="font-semibold text-foreground/85">
                Day {(day.week.number - 1) * 7 + day.dayNumber}
              </span>
            </div>
            <h1 className="display-hero text-3xl sm:text-4xl">{day.focus}</h1>
            {weekStyleInfo && (
              <p className="text-sm text-muted mt-2.5 leading-relaxed max-w-lg">
                {weekStyleInfo.desc}
              </p>
            )}
          </div>
        </div>

        <WorkoutLogger
          dayId={day.id}
          unit={user.unit as Unit}
          exercises={exercises}
          initialStatus={session?.status === "completed" ? "completed" : "in_progress"}
          initialMeta={{
            notes: session?.notes ?? "",
            mood: session?.mood ?? "",
            bodyweight: session?.bodyweight ?? null,
          }}
        />
      </main>
    </>
  );
}
