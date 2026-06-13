import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProgress, getPlateaus, getAllPlans } from "@/lib/metrics";
import { focusKey, quoteForDay, fmtVolume, type Unit } from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import MusclePhoto from "@/app/components/MusclePhoto";
import ReminderNudge from "@/app/components/ReminderNudge";
import WeekSwitcher from "@/app/components/WeekSwitcher";
import WelcomeTour from "@/app/components/WelcomeTour";
import PlateauCoach from "@/app/components/PlateauCoach";
import PlanPicker from "@/app/components/PlanPicker";
import {
  Reveal,
  GlowCard,
  AnimatedNumber,
  AnimatedRing,
} from "@/app/components/motion";

const statusMeta: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  completed: {
    label: "Completed",
    cls: "text-accent-2 border-accent-2/30 bg-accent-2/10",
    dot: "bg-accent-2",
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
  const plateaus = p?.enrolled && hasWorkouts ? await getPlateaus(user.id) : [];
  // Not enrolled yet → offer the available plans to choose from.
  const plans = p?.enrolled ? [] : await getAllPlans();
  const firstName = user.name.split(" ")[0];
  // Enrolled but nothing logged yet — show an inviting first-run hero instead
  // of a wall of zeros.
  const fresh = !!p?.enrolled && hasWorkouts && p.completedWorkouts === 0;

  // "Up next" = first not-completed training day (skip rest days if possible).
  const nextDay =
    p?.days.find(
      (d) => d.status !== "completed" && !d.focus.toLowerCase().includes("rest")
    ) ??
    p?.days.find((d) => d.status !== "completed") ??
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
          <p className="text-muted text-xs uppercase tracking-[0.18em] font-semibold">
            Welcome back
          </p>
          <h1 className="display-hero text-4xl sm:text-5xl mt-1">
            Hi <span className="num-brand">{firstName}</span>{" "}
            <span className="inline-block">👋</span>
          </h1>
        </div>

        {p?.enrolled && hasWorkouts && (
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
          <div
            className="relative overflow-hidden card p-8 sm:p-10 mt-6 text-center animate-fade-up"
            style={{
              background:
                "linear-gradient(135deg, rgba(47,107,255,0.12), rgba(124,140,255,0.10))",
            }}
          >
            <div className="text-4xl">🏗️</div>
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

        {p?.enrolled && hasWorkouts && (
          <>
            {/* Photo hero — "up next" workout */}
            {nextDay && (
              <Reveal>
                <Link
                  href={`/workout/${nextDay.dayId}`}
                  className="relative block overflow-hidden rounded-2xl mt-6 img-overlay group h-64 sm:h-72"
                >
                  <MusclePhoto
                    srcKey={focusKey(nextDay.focus)}
                    alt={nextDay.focus}
                    className="absolute inset-0 w-full h-full object-cover duotone kenburns"
                  />
                  {/* Trophy stats — make the hero screenshot-worthy */}
                  {(p.currentStreak > 0 || p.totalVolume > 0) && (
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                      {p.currentStreak > 0 && (
                        <div className="rounded-2xl bg-black/35 border border-white/15 backdrop-blur px-3.5 py-2 text-center">
                          <div className="font-display text-2xl font-bold text-white leading-none">
                            {p.currentStreak}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-white/70 mt-1">
                            🔥 day streak
                          </div>
                        </div>
                      )}
                      {p.totalVolume > 0 && (
                        <div className="rounded-2xl bg-black/35 border border-white/15 backdrop-blur px-3.5 py-2 text-center hidden xs:block">
                          <div className="font-display text-2xl font-bold text-white leading-none">
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
                    <span className="chip w-fit mb-3 !bg-black/30 !border-white/20 text-white backdrop-blur">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      {nextDay.status === "in_progress"
                        ? "Continue"
                        : "Up next"}{" "}
                      · Day {(currentWeek - 1) * 7 + nextIndex + 1}
                    </span>
                    <h2 className="font-display text-3xl sm:text-4xl font-bold text-white drop-shadow">
                      {nextDay.focus}
                    </h2>
                    <p className="text-white/80 text-sm mt-2 max-w-md italic">
                      “{quoteForDay(nextIndex + p.completedWorkouts)}”
                    </p>
                    <span className="btn-primary w-fit mt-4 !px-5">
                      {nextDay.status === "in_progress"
                        ? "Continue workout"
                        : "Start workout"}{" "}
                      →
                    </span>
                  </div>
                </Link>
              </Reveal>
            )}

            {/* First-run hero — nothing logged yet */}
            {fresh && (
              <section
                className="card p-6 sm:p-8 mt-4 animate-fade-up relative overflow-hidden"
                style={{ background: "var(--grad-brand-soft)" }}
              >
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 text-center sm:text-left">
                  <div className="relative grid place-items-center w-[132px] h-[132px] shrink-0">
                    <div className="absolute inset-0 rounded-full border-[6px] border-dashed border-accent/30" />
                    <span className="text-5xl animate-pulse-soft">🔥</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] font-semibold text-accent">
                      Day one
                    </p>
                    <h2 className="display-hero text-2xl sm:text-3xl mt-1">
                      Your stats start <span className="num-brand">here</span>
                    </h2>
                    <p className="text-muted text-sm mt-2 max-w-md">
                      Log your first session and your adherence, volume and
                      streak come alive. Every rep counts from here.
                    </p>
                    <Link
                      href="/workout/next"
                      className="btn-primary inline-flex w-fit mt-4 !px-5"
                    >
                      Start your first workout →
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* Hero: adherence ring + stats */}
            <section
              className={`card p-6 sm:p-8 mt-4 animate-fade-up ${fresh ? "hidden" : ""}`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <AnimatedRing pct={p.workoutAdherence} size={150} stroke={14}>
                  <div>
                    <div className="text-5xl font-display font-bold num-brand">
                      <AnimatedNumber value={p.workoutAdherence} />
                      <span className="text-xl text-muted">%</span>
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-muted mt-0.5">
                      Plan adherence
                    </div>
                  </div>
                </AnimatedRing>

                <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Stat
                    label="Workouts done"
                    value={`${p.completedWorkouts}/${p.prescribedWorkouts}`}
                    color="var(--accent)"
                  />
                  <Stat
                    label="Sets completed"
                    value={`${p.setAdherence}%`}
                    sub={`${p.doneSetsTotal}/${p.prescribedSetsTotal}`}
                    color="var(--accent-2)"
                  />
                  <Stat
                    label="Rep quality"
                    value={`${p.repQuality}%`}
                    color="var(--accent-3)"
                  />
                  <Stat
                    label={`Total volume (${user.unit})`}
                    value={fmtVolume(p.totalVolume, user.unit as Unit)}
                    color="var(--accent-hi)"
                  />
                  <Stat
                    label="Weeks loaded"
                    value={`${p.weeksSeeded}/${p.totalWeeks}`}
                    color="var(--accent)"
                  />
                  <Link
                    href="/targets"
                    className="card card-hover p-4 flex flex-col justify-center items-start"
                  >
                    <span className="text-sm font-semibold">🎯 This week&apos;s targets</span>
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

            {/* Coach — proactive plateau / deload guidance */}
            <PlateauCoach plateaus={plateaus} unit={user.unit as Unit} />

            {/* Workouts */}
            {(() => {
              const wk =
                p.weekly.find((w) => w.weekNumber === selectedWeek) ??
                p.weekly[0];
              return (
                <>
                  {wk?.completed && (
                    <Reveal>
                      <div
                        className="relative overflow-hidden card p-5 mt-10 flex items-center gap-4"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(47,230,168,0.16), rgba(124,140,255,0.12))",
                        }}
                      >
                        <span className="grid place-items-center w-12 h-12 rounded-2xl bg-accent-2/20 text-2xl shrink-0">
                          🏆
                        </span>
                        <div>
                          <div className="font-display font-bold text-lg">
                            Week {wk.weekNumber}
                            {wk.style ? ` : ${wk.style}` : ""} complete!
                          </div>
                          <div className="text-sm text-muted">
                            All {wk.trainingDays} workouts done. Outstanding
                            consistency 💪
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
                      <span className="chip text-accent-2 border-accent-2/30 bg-accent-2/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-2" />
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
                  <GlowCard>
                  <Link
                    href={`/workout/${d.dayId}`}
                    className={`card p-0 group block h-full overflow-hidden ${
                      isToday ? "ring-2 ring-accent/70" : ""
                    }`}
                  >
                    <div className="relative h-36 img-overlay">
                      <MusclePhoto
                        srcKey={focusKey(d.focus)}
                        alt={d.focus}
                        sizes="(max-width: 640px) 100vw, 480px"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 duotone"
                      />
                      {isToday && (
                        <span className="absolute top-3 left-3 z-10 chip !bg-accent !border-accent text-[#ffffff] font-bold">
                          {d.status === "in_progress" ? "CONTINUE" : "TODAY"}
                        </span>
                      )}
                      <div className="absolute inset-0 z-10 p-4 flex items-end justify-between gap-2">
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-white/70">
                            Day {(selectedWeek - 1) * 7 + i + 1}
                          </div>
                          <div className="font-display font-bold text-white text-xl leading-tight drop-shadow">
                            {d.focus}
                          </div>
                        </div>
                        <span className={`chip ${meta.cls} border shrink-0`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      {!isRest && (
                        <div className="flex items-center gap-3 text-xs text-muted mb-3">
                          <span className="flex items-center gap-1.5">
                            🏋️ {d.exerciseCount} exercises
                          </span>
                        </div>
                      )}
                    {!isRest ? (
                      <div>
                        <div className="flex justify-between text-xs text-muted mb-1.5">
                          <span>{d.doneSets} / {d.prescribedSets} sets</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hi transition-all"
                            style={{ width: `${pct}%` }}
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
                  </GlowCard>
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
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: color }}
        />
        <span className="text-xs text-muted">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold num-gradient mt-1.5">{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
