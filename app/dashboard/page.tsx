import Link from "next/link";
import { Flame, Target, Trophy, Dumbbell, Hammer } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getProgress,
  getAllPlans,
  buildTimeline,
  getActiveEnrollment,
  getPlateaus,
  getCycleComparison,
  getReadiness,
} from "@/lib/metrics";
import {
  focusKey,
  quoteForDay,
  fmtVolume,
  type Unit,
} from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import MusclePhoto from "@/app/components/MusclePhoto";
import ReminderNudge from "@/app/components/ReminderNudge";
import WeekSwitcher from "@/app/components/WeekSwitcher";
import WelcomeTour from "@/app/components/WelcomeTour";
import PlanTimelineCard from "@/app/components/PlanTimelineCard";
import StartProgram from "@/app/components/StartProgram";
import PlanPicker from "@/app/components/PlanPicker";
import ProgramCompleteCard from "@/app/components/ProgramCompleteCard";
import CoachCard from "@/app/components/CoachCard";
import CycleProgress from "@/app/components/CycleProgress";
import ReadinessCard from "@/app/components/ReadinessCard";
import {
  Reveal,
  AnimatedNumber,
  AnimatedRing,
} from "@/app/components/motion";

const statusMeta: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  completed: {
    label: "Completed",
    cls: "text-success border-success/30 bg-success/10",
    dot: "bg-success",
  },
  in_progress: {
    label: "In progress",
    cls: "text-warn border-warn/30 bg-warn/10",
    dot: "bg-warn",
  },
  not_started: {
    label: "Not started",
    cls: "text-muted border-border bg-surface-2",
    dot: "bg-muted",
  },
  skipped: {
    label: "Skipped",
    cls: "text-muted border-border bg-surface-2 opacity-70",
    dot: "bg-muted",
  },
};

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.onboardedAt) redirect("/onboarding");
  const p = await getProgress(user.id);
  // A placeholder program (selected but no workouts built yet) has no days.
  const hasWorkouts = (p?.days.length ?? 0) > 0;
  // Not enrolled yet → offer the available plans to choose from.
  const plans = p?.enrolled ? [] : await getAllPlans(user.id);
  const firstName = user.name.split(" ")[0];
  // Enrolled but nothing logged yet — show an inviting first-run hero instead
  // of a wall of zeros.
  const fresh = !!p?.enrolled && hasWorkouts && p.completedWorkouts === 0;
  const timeline = p?.enrolled && hasWorkouts ? buildTimeline(p) : null;

  // Day-85: every training day of the block is complete (or consciously skipped).
  const programDone =
    !!p?.enrolled &&
    hasWorkouts &&
    p.days.every(
      (d) =>
        d.focus.toLowerCase().includes("rest") ||
        d.status === "completed" ||
        d.status === "skipped"
    );
  const activeEnrollment = programDone ? await getActiveEnrollment(user.id) : null;

  // Coaching insights — stalled lifts + cycle-over-cycle deltas (both are
  // cheap no-ops for fresh accounts).
  const [plateaus, cycleCmp, readiness] = p?.enrolled
    ? await Promise.all([
        getPlateaus(user.id),
        getCycleComparison(user.id),
        getReadiness(user.id, user.timezone),
      ])
    : [[], null, null];

  // "Up next" = first open training day (not completed, not consciously skipped).
  const open = (d: { status: string }) =>
    d.status !== "completed" && d.status !== "skipped";
  const nextDay =
    p?.days.find(
      (d) => open(d) && !d.focus.toLowerCase().includes("rest")
    ) ??
    p?.days.find(open) ??
    p?.days[0];

  // The week containing the next workout (default view + hero day index).
  const currentWeek = nextDay?.weekNumber ?? p?.weekly[0]?.weekNumber ?? 1;
  const currentWeekDays = p?.days.filter((d) => d.weekNumber === currentWeek) ?? [];
  const nextIndex = nextDay
    ? Math.max(0, currentWeekDays.findIndex((d) => d.dayId === nextDay.dayId))
    : 0;

  // Week switcher — pick the week to display (defaults to current).
  const availableWeeks = (p?.weekly ?? []).map((w) => w.weekNumber);
  const weekParam = Number((await searchParams).week);
  const selectedWeek = availableWeeks.includes(weekParam)
    ? weekParam
    : currentWeek;
  const weekDays = p?.days.filter((d) => d.weekNumber === selectedWeek) ?? [];

  // Reminder/nudge context (derived from getProgress — no extra query).
  const loggedToday = p?.loggedToday ?? false;
  const scheduled = user.trainingDays
    ? user.trainingDays.split(",").map(Number)
    : null;
  const todayDow = new Date().getDay();
  const trainingToday = scheduled
    ? scheduled.includes(todayDow)
    : !!nextDay && !nextDay.focus.toLowerCase().includes("rest");

  return (
    <>
      <NavBar user={user} />
      <WelcomeTour />
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <div className="animate-fade-up">
          <p className="eyebrow">Welcome back</p>
          <h1 className="display-hero text-4xl sm:text-5xl mt-1">
            Hi <span className="text-accent">{firstName}</span>
          </h1>
        </div>

        {programDone && (
          <div className="mt-6">
            <ProgramCompleteCard cycle={activeEnrollment?.cycle ?? 1} />
          </div>
        )}

        {p?.enrolled && hasWorkouts && !programDone && (
          <ReminderNudge
            trainingToday={trainingToday}
            loggedToday={loggedToday}
            streak={p?.currentStreak ?? 0}
            focus={nextDay?.focus ?? null}
            dayId={nextDay?.dayId ?? null}
            remindersOn={user.remindersOn}
          />
        )}

        {/* Enrolled in a program whose workouts aren't built yet */}
        {p?.enrolled && !hasWorkouts && (
          <div className="relative overflow-hidden card p-8 sm:p-10 mt-6 text-center animate-fade-up">
            <Hammer className="w-9 h-9 mx-auto text-muted" strokeWidth={1.75} />
            <h2 className="font-display text-2xl font-bold mt-3">
              {p.plan.name}
            </h2>
            <p className="text-muted mt-2 max-w-md mx-auto">
              This program&apos;s workouts are coming soon. Check back shortly —
              or switch to another program in the meantime.
            </p>
            <Link href="/plans" className="btn-primary mt-6 !px-6 !py-3">
              Switch program →
            </Link>
          </div>
        )}

        {/* No plans seeded at all */}
        {!p?.enrolled && plans.length === 0 && (
          <div className="card p-6 mt-6 animate-fade-up">
            <p className="text-muted">
              No training plan is loaded yet. Run <code>npm run seed</code> to
              load it.
            </p>
          </div>
        )}

        {/* Not enrolled → choose a plan to start */}
        {!p?.enrolled && plans.length > 0 && <PlanPicker plans={plans} />}

        {timeline &&
          (timeline.started ? (
            <PlanTimelineCard t={timeline} />
          ) : (
            <section className="card p-6 mt-6 animate-fade-up flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h2 className="font-display font-bold text-xl">
                  Ready to begin?
                </h2>
                <p className="text-sm text-muted mt-1">
                  Start the program and Day 1 of your {timeline.totalDays}-day
                  plan begins today. You can adjust the date later on the
                  timeline.
                </p>
              </div>
              <StartProgram className="shrink-0 sm:w-56" />
            </section>
          ))}

        {p?.enrolled && hasWorkouts && (
          <>
            {/* Photo hero — the next session over a full-bleed muscle shot */}
            {nextDay && (
              <Reveal>
                <Link
                  href={`/workout/${nextDay.dayId}`}
                  className="relative block overflow-hidden rounded-2xl mt-6 img-overlay group h-72 sm:h-80"
                >
                  <MusclePhoto
                    srcKey={focusKey(nextDay.focus)}
                    alt={nextDay.focus}
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="absolute inset-0 w-full h-full object-cover duotone kenburns"
                  />
                  {/* Trophy stats — glass chips, screenshot-worthy */}
                  {(p.currentStreak > 0 || p.totalVolume > 0) && (
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                      {p.currentStreak > 0 && (
                        <div className="rounded-xl bg-black/35 border border-white/15 backdrop-blur px-3.5 py-2 text-center">
                          <div className="stat-num text-2xl text-white leading-none">
                            {p.currentStreak}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-white/70 mt-1 flex items-center justify-center gap-1">
                            <Flame size={11} /> day streak
                          </div>
                        </div>
                      )}
                      {p.totalVolume > 0 && (
                        <div className="rounded-xl bg-black/35 border border-white/15 backdrop-blur px-3.5 py-2 text-center hidden xs:block">
                          <div className="stat-num text-2xl text-white leading-none">
                            {fmtVolume(p.totalVolume, user.unit as Unit)}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-white/70 mt-1">
                            {user.unit} lifted
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 z-10 p-6 sm:p-8 flex flex-col justify-end">
                    <p className="eyebrow text-white/75 drop-shadow">
                      {nextDay.status === "in_progress"
                        ? "Continue session"
                        : "Next session"}
                    </p>
                    <h2 className="display-hero text-4xl sm:text-5xl text-white drop-shadow-lg mt-2">
                      {nextDay.focus}
                    </h2>
                    <p className="stat-num text-sm text-white/85 mt-3 drop-shadow">
                      Week {currentWeek} · Day{" "}
                      {(currentWeek - 1) * 7 + nextIndex + 1}
                    </p>
                    <p className="text-white/80 text-sm mt-2 max-w-md italic drop-shadow">
                      “{quoteForDay(nextIndex + p.completedWorkouts)}”
                    </p>
                    <span className="btn-primary w-fit mt-5 !px-5">
                      {nextDay.status === "in_progress"
                        ? "Continue workout"
                        : "Start workout"}{" "}
                      →
                    </span>
                  </div>
                </Link>
              </Reveal>
            )}

            {/* Coaching insights — daily check-in + cycle deltas + plateau watch */}
            <div
              className={`grid gap-4 mt-4 ${
                cycleCmp || plateaus.length > 0 ? "md:grid-cols-2" : ""
              }`}
            >
              {readiness && (
                <ReadinessCard
                  initial={
                    readiness.today ?? {
                      sleepQuality: null,
                      soreness: null,
                      energy: null,
                    }
                  }
                  roughPatch={readiness.roughPatch}
                  lightWeekUntil={user.lightWeekUntil?.toISOString() ?? null}
                />
              )}
              <CycleProgress cmp={cycleCmp} unit={user.unit as Unit} />
              <CoachCard plateaus={plateaus} unit={user.unit as Unit} />
            </div>

            {/* Hero: adherence ring + stats — only once there's data to show */}
            <section
              className={`card p-6 sm:p-8 mt-4 animate-fade-up ${fresh ? "hidden" : ""}`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <AnimatedRing pct={p.workoutAdherence} size={150} stroke={14}>
                  <div>
                    <div className="display-num text-5xl">
                      <AnimatedNumber value={p.workoutAdherence} />
                      <span className="text-xl text-muted">%</span>
                    </div>
                    <div className="eyebrow mt-0.5">Plan adherence</div>
                  </div>
                </AnimatedRing>

                <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Stat
                    label="Workouts done"
                    value={`${p.completedWorkouts}/${p.prescribedWorkouts}`}
                    tone="border-l-accent"
                  />
                  <Stat
                    label="Sets completed"
                    value={`${p.setAdherence}%`}
                    sub={`${p.doneSetsTotal}/${p.prescribedSetsTotal}`}
                    tone="border-l-success"
                  />
                  <Stat
                    label="Rep quality"
                    value={`${p.repQuality}%`}
                    tone="border-l-steel"
                  />
                  <Stat
                    label={`Total volume (${user.unit})`}
                    value={fmtVolume(p.totalVolume, user.unit as Unit)}
                    tone="border-l-accent"
                  />
                  <Stat
                    label="Weeks loaded"
                    value={`${p.weeksSeeded}/${p.totalWeeks}`}
                    tone="border-l-accent"
                  />
                  <Link
                    href="/targets"
                    className="card card-hover p-4 flex flex-col justify-center items-start"
                  >
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <Target size={15} className="text-accent" /> This week&apos;s targets
                    </span>
                    <span className="text-accent text-sm font-semibold mt-1">
                      Open →
                    </span>
                  </Link>
                  <Link
                    href="/analysis"
                    className="card card-hover p-4 flex flex-col justify-center items-start"
                  >
                    <span className="text-sm font-semibold">Full analysis</span>
                    <span className="text-accent text-sm font-semibold mt-1">
                      Open →
                    </span>
                  </Link>
                </div>
              </div>
            </section>

            {/* Workouts */}
            {(() => {
              const wk =
                p.weekly.find((w) => w.weekNumber === selectedWeek) ??
                p.weekly[0];
              return (
                <>
                  {wk?.completed && (
                    <Reveal>
                      <div className="relative overflow-hidden card p-5 mt-10 flex items-center gap-4 border-success/30 bg-success/5">
                        <span className="grid place-items-center w-12 h-12 rounded-xl bg-success/20 shrink-0">
                          <Trophy className="w-6 h-6 text-success" />
                        </span>
                        <div>
                          <div className="font-display font-bold text-lg">
                            Week {wk.weekNumber}
                            {wk.style ? ` : ${wk.style}` : ""} complete!
                          </div>
                          <div className="text-sm text-muted">
                            All {wk.trainingDays} workouts done. Outstanding
                            consistency.
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  )}

                  <div className="flex items-center justify-between mt-10 mb-4 gap-3 flex-wrap">
                    <WeekSwitcher
                      weeks={p.weekly.map((w) => ({
                        number: w.weekNumber,
                        style: w.style,
                        completed: w.completed,
                      }))}
                      selected={selectedWeek}
                      current={currentWeek}
                    />
                    {wk?.completed ? (
                      <span className="chip text-success border-success/30 bg-success/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        Done
                      </span>
                    ) : (
                      <span className="chip">
                        {wk?.trainingDone ?? 0}/{wk?.trainingDays ?? 0} ·{" "}
                        {wk?.trainingPct ?? 0}%
                      </span>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="grid sm:grid-cols-2 gap-3 stagger">
              {weekDays.map((d, i) => {
                const meta = statusMeta[d.status];
                const pct = d.prescribedSets
                  ? Math.round((d.doneSets / d.prescribedSets) * 100)
                  : 0;
                const isRest = d.focus.toLowerCase().includes("rest");
                const isToday = nextDay?.dayId === d.dayId;
                return (
                  <Reveal key={d.dayId} delay={i * 0.05}>
                  <Link
                    href={`/workout/${d.dayId}`}
                    className={`card card-hover glow-card p-0 group block h-full overflow-hidden ${
                      isToday ? "ring-2 ring-accent/70" : ""
                    }`}
                  >
                    {/* Photographic card top — the muscle group, in pictures */}
                    <div className="relative h-36 img-overlay">
                      <MusclePhoto
                        srcKey={focusKey(d.focus)}
                        alt={d.focus}
                        sizes="(max-width: 640px) 100vw, 480px"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 duotone"
                      />
                      {isToday && (
                        <span className="absolute top-3 left-3 z-10 chip !bg-accent !border-accent text-accent-ink !py-0 text-[10px] font-bold">
                          {d.status === "in_progress" ? "CONTINUE" : "TODAY"}
                        </span>
                      )}
                      <div className="absolute inset-0 z-10 p-4 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                            Day {(selectedWeek - 1) * 7 + i + 1}
                          </div>
                          <div className="font-display font-bold text-white text-xl leading-tight drop-shadow">
                            {d.focus}
                          </div>
                        </div>
                        <span className={`chip ${meta.cls} border shrink-0 backdrop-blur`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      {!isRest ? (
                        <div>
                          <div className="flex items-center justify-between gap-3 text-xs text-muted mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Dumbbell size={13} /> {d.exerciseCount} exercises
                            </span>
                            <span className="stat-num">
                              {d.doneSets}/{d.prescribedSets} sets · {pct}%
                            </span>
                          </div>
                          <div className="h-1 rounded-sm bg-surface-2 overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: "var(--grad-brand)",
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted">
                          Active recovery · light cardio
                        </p>
                      )}
                    </div>
                  </Link>
                  </Reveal>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: string; // border-l-<token> — semantic left rule instead of a dot
}) {
  return (
    <div className={`card p-4 border-l-2 ${tone}`}>
      <div className="eyebrow">{label}</div>
      <div className="stat-num text-2xl mt-1.5">{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
