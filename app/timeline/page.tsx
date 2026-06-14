import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getProgress, buildTimeline, type TimelineDay } from "@/lib/metrics";
import { ymd } from "@/lib/date";
import NavBar from "@/app/components/NavBar";
import PhotoHero from "@/app/components/PhotoHero";
import StartDateEditor from "@/app/components/StartDateEditor";

export const metadata = { title: "Timeline" };

const fmtFull = (d: Date) =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const fmtShort = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const WD = ["1", "2", "3", "4", "5", "6", "7"];

function cellClass(d: TimelineDay): string {
  if (d.isToday) return "border-accent bg-accent/10 ring-2 ring-accent/40";
  if (d.isRest) return "border-border bg-surface-2/60 text-muted";
  if (d.status === "completed") return "border-accent-2/45 bg-accent-2/10";
  if (d.status === "in_progress") return "border-accent/40 bg-accent/5";
  if (d.missed) return "border-amber-500/40 bg-amber-500/10";
  return "border-border bg-surface-2 text-muted"; // upcoming
}

export default async function TimelinePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const p = await getProgress(user.id);
  if (!p?.enrolled || p.days.length === 0) {
    return (
      <>
        <NavBar user={user} />
        <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
          <div className="card p-8 text-center animate-fade-up">
            <CalendarDays className="w-9 h-9 mx-auto text-muted" strokeWidth={1.75} />
            <h1 className="font-display text-2xl font-bold mt-3">No plan yet</h1>
            <p className="text-muted mt-2">
              Start a program to see your 12-week timeline mapped to real dates.
            </p>
            <Link href="/plans" className="btn-primary mt-6 !px-6 !py-3">
              Browse plans →
            </Link>
          </div>
        </main>
      </>
    );
  }

  const t = buildTimeline(p);

  // Group days into weeks of 7 for the calendar grid.
  const weeks: TimelineDay[][] = [];
  for (let i = 0; i < t.days.length; i += 7) weeks.push(t.days.slice(i, i + 7));

  const overallPct = Math.round((t.completedWorkouts / (t.totalWorkouts || 1)) * 100);

  const summary = !t.hasStarted
    ? `Your plan starts ${fmtShort(t.startDate)}.`
    : t.hasFinished
      ? "You've reached the end of the plan — nice work."
      : t.behind > 0
        ? `The schedule has you on Day ${t.currentDayIndex}. You're ${t.behind} workout${
            t.behind === 1 ? "" : "s"
          } behind — log them to catch up.`
        : `On track — you're current through Day ${t.currentDayIndex}.`;

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-8">
        <PhotoHero
          queryKey="page:timeline"
          title="Timeline"
          subtitle="Your whole 12-week plan, mapped to real dates."
        />

        {/* Summary */}
        <section className="card p-6 animate-fade-up">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-display font-bold text-2xl">
              Day {t.currentDayIndex}
              <span className="text-muted font-medium text-lg"> of {t.totalDays}</span>
            </h2>
            <span className="text-sm font-semibold text-muted">
              Week {t.currentWeek} · {overallPct}% done
            </span>
          </div>
          <p className="text-sm text-muted mt-2 leading-relaxed">{summary}</p>

          <div className="mt-4 h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: `${Math.round((t.currentDayIndex / t.totalDays) * 100)}%`,
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted">
              {fmtFull(t.startDate)} → {fmtFull(t.endDate)}
            </span>
            <StartDateEditor startDate={ymd(t.startDate)} />
          </div>
        </section>

        {/* Calendar grid */}
        <section className="card p-5 sm:p-6 animate-fade-up">
          <div className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1.5 sm:gap-2">
            {/* header row */}
            <div />
            {WD.map((w, i) => (
              <div
                key={i}
                className="text-center text-[11px] font-semibold text-muted pb-1"
              >
                {w}
              </div>
            ))}

            {weeks.map((week, wi) => (
              <FragmentRow key={wi} weekNumber={week[0]?.weekNumber ?? wi + 1} week={week} />
            ))}
          </div>

          {/* legend */}
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted">
            <Legend className="bg-accent-2/30 border-accent-2/45" label="Done" />
            <Legend className="bg-amber-500/20 border-amber-500/40" label="Missed" />
            <Legend className="bg-accent/15 border-accent/50" label="Today" />
            <Legend className="bg-surface-2 border-border" label="Upcoming" />
            <Legend className="bg-surface-2/60 border-border" label="Rest" />
          </div>
        </section>
      </main>
    </>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded border ${className}`} />
      {label}
    </span>
  );
}

function FragmentRow({
  weekNumber,
  week,
}: {
  weekNumber: number;
  week: TimelineDay[];
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-1 text-[11px] font-semibold text-muted tabular-nums">
        W{weekNumber}
      </div>
      {week.map((d) => {
        const inner = (
          <>
            <span className="text-[10px] font-medium opacity-70 leading-none">
              {d.date.toLocaleDateString("en-US", { month: "short" })}{" "}
              {d.date.getDate()}
            </span>
            <span className="text-xs font-semibold leading-tight line-clamp-2">
              {d.isRest ? "Rest" : d.focus}
            </span>
          </>
        );
        const base = `flex flex-col gap-0.5 rounded-lg border p-1.5 sm:p-2 min-h-[3.6rem] text-left ${cellClass(
          d
        )}`;
        return d.isRest ? (
          <div key={d.dayId} className={base} title={fmtFull(d.date)}>
            {inner}
          </div>
        ) : (
          <Link
            key={d.dayId}
            href={`/workout/${d.dayId}`}
            className={`${base} transition-transform active:scale-[0.97] hover:border-border-strong`}
            title={`${d.focus} · ${fmtFull(d.date)}`}
          >
            {inner}
          </Link>
        );
      })}
    </>
  );
}
