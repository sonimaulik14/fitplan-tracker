import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getLastTimeByExercise,
  getSwaps,
  getDaySupplements,
  getActiveEnrollment,
  getPlateaus,
} from "@/lib/metrics";
import { termInfo, type Unit } from "@/lib/ui";
import { dayKeyInTz } from "@/lib/date";
import {
  readinessScore,
  effectiveTrimFactor,
  lightWeekActive,
} from "@/lib/readiness";
import { BatteryMedium } from "lucide-react";
import NavBar from "@/app/components/NavBar";
import WorkoutLogger, { type LoggerExercise } from "@/app/components/WorkoutLogger";
import DaySupplements from "@/app/components/DaySupplements";

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

  const enrollment = await getActiveEnrollment(user.id, day.week.planId);
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

  const [lastTime, swaps, daySupplements, plateaus, todayLog] = await Promise.all([
    getLastTimeByExercise(user.id, day.week.planId, day.id),
    getSwaps(user.id, day.week.planId),
    getDaySupplements(user.id, day.id),
    getPlateaus(user.id),
    prisma.dailyLog.findUnique({
      where: {
        userId_day: { userId: user.id, day: dayKeyInTz(user.timezone) },
      },
      select: { sleepQuality: true, soreness: true, energy: true },
    }),
  ]);
  const todayScore = readinessScore(
    todayLog ?? { sleepQuality: null, soreness: null, energy: null }
  );
  const lightWeek = lightWeekActive(user.lightWeekUntil);
  const readiness = effectiveTrimFactor(todayScore, lightWeek);
  const plateauByName = new Map(plateaus.map((p) => [p.name, p]));

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
    const plateau = plateauByName.get(effectiveName);
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
      lastTime: prev
        ? { weight: prev.weight, reps: prev.reps, rpe: prev.rpe }
        : null,
      bestE1rm: prev?.bestE1rm ?? 0,
      plateau: plateau
        ? { deloadKg: plateau.deloadKg, sessionsStalled: plateau.sessionsStalled }
        : null,
      rows,
    };
  });

  const weekStyleInfo = day.week.style ? termInfo(day.week.style) : null;

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-solid py-1.5 pl-2 pr-3.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:border-border-strong transition-colors"
        >
          <ChevronLeft size={16} /> Dashboard
        </Link>
        <div className="mt-6 mb-8 animate-fade-up">
          <p className="eyebrow flex items-center gap-2">
            <span>Week {day.week.number}</span>
            {day.week.style && (
              <>
                <span className="text-border-strong">·</span>
                <span className="text-accent">{day.week.style}</span>
              </>
            )}
            <span className="text-border-strong">·</span>
            <span>Day {(day.week.number - 1) * 7 + day.dayNumber}</span>
          </p>
          <h1 className="display-hero text-4xl sm:text-5xl mt-3">{day.focus}</h1>
          {weekStyleInfo && (
            <p className="text-sm text-muted mt-3 leading-relaxed max-w-xl">
              {weekStyleInfo.desc}
            </p>
          )}
        </div>

        {todayScore == null && (
          <Link
            href="/dashboard#checkin"
            className="card flex items-center gap-3 px-4 py-3 mb-5 text-sm card-hover"
          >
            <BatteryMedium size={15} className="text-accent shrink-0" aria-hidden />
            <span className="flex-1">
              10-second check-in → today&apos;s suggestions adapt to how
              you&apos;re feeling.
            </span>
            <span className="text-accent font-semibold text-xs shrink-0">
              Check in →
            </span>
          </Link>
        )}

        <div className="mb-5">
          <DaySupplements workoutDayId={day.id} supplements={daySupplements} />
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
          readinessFactor={readiness}
          lightWeekEnds={
            lightWeek ? user.lightWeekUntil!.toISOString() : null
          }
        />
      </main>
    </>
  );
}
