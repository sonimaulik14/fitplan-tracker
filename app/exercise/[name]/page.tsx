import Link from "next/link";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getExerciseHistory,
  resolveExerciseSlug,
  getCycleComparison,
} from "@/lib/metrics";
import {
  fmtWeight,
  fmtVolume,
  weightNum,
  strengthStandard,
  muscleStyle,
  type Unit,
} from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import BodyweightChart from "@/app/components/BodyweightChart";
import { MuscleGlyph } from "@/app/components/icons";
import { ExerciseDemoHero } from "@/app/components/ExerciseDemo";

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: raw } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;

  // Clean slug → real exercise name + muscle (falls back to the decoded param).
  const resolved = await resolveExerciseSlug(user.id, raw);
  const name = resolved?.name ?? decodeURIComponent(raw);

  const [h, cycleCmp] = await Promise.all([
    getExerciseHistory(user.id, name),
    getCycleComparison(user.id),
  ]);
  const cycleDelta =
    cycleCmp?.lifts.find((l) => l.name.toLowerCase() === name.toLowerCase()) ??
    null;
  // History only knows the muscle from logged sets; use the plan's muscle when
  // the exercise hasn't been logged yet.
  const muscle = h.muscle !== "Other" ? h.muscle : resolved?.muscle ?? h.muscle;
  const st = muscleStyle(muscle);
  const standard =
    h.best1RM > 0 ? strengthStandard(h.best1RM, h.latestBwKg, name) : null;
  const chartPoints = h.points.map((p) => ({ date: p.date, weight: p.topWeight }));

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-6">
        <Link
          href="/analysis"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} aria-hidden /> Back
        </Link>

        {/* Header */}
        <div className="animate-fade-up">
          <p className="eyebrow flex items-center gap-1.5" style={{ color: st.color }}>
            <MuscleGlyph muscle={muscle} size={13} /> {muscle}
          </p>
          <h1 className="display-hero text-3xl sm:text-4xl mt-2">{name}</h1>
        </div>

        {/* Demo media — real clip if available, else muscle visual + video link */}
        <ExerciseDemoHero name={name} muscle={muscle} />

        {h.points.length === 0 ? (
          <div className="card p-10 text-center text-muted animate-fade-up">
            No sets logged for this exercise yet. Log it in a workout and your
            trend, 1RM and session history will show up here.
          </div>
        ) : (
          <>
            {/* Stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-up">
              <div className="card p-4">
                <div className="eyebrow">Best est. 1RM</div>
                <div className="stat-num text-2xl sm:text-3xl mt-1.5">
                  {fmtWeight(h.best1RM, unit)}
                </div>
                {cycleDelta && (
                  <div
                    className={`text-xs mt-1 stat-num ${
                      cycleDelta.deltaKg > 0.01
                        ? "text-success"
                        : cycleDelta.deltaKg < -0.01
                          ? "text-danger"
                          : "text-muted"
                    }`}
                  >
                    {cycleDelta.deltaKg > 0.01 ? "+" : ""}
                    {fmtWeight(cycleDelta.deltaKg, unit)} vs cycle{" "}
                    {cycleCmp!.prevCycle}
                  </div>
                )}
              </div>
              <div className="card p-4">
                <div className="eyebrow">Sessions</div>
                <div className="stat-num text-2xl sm:text-3xl mt-1.5">
                  {h.points.length}
                </div>
              </div>
              {standard && (
                <div className="card p-4 col-span-2 sm:col-span-1">
                  <div className="eyebrow">Strength level</div>
                  <div className="display-num text-2xl sm:text-3xl mt-1.5">
                    {standard.level}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {standard.ratio}× bodyweight
                  </div>
                </div>
              )}
            </div>

            {/* Plateau banner */}
            {h.plateau && (
              <div className="card p-4 border border-warn/30 bg-warn/5 flex items-start gap-3 animate-fade-up">
                <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" aria-hidden />
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold">Plateau detected</span> — your
                  estimated 1RM hasn&apos;t improved in 3 sessions. Consider a
                  deload week, a rep-range change, or an exercise swap.
                </p>
              </div>
            )}

            {/* Weight trend */}
            <section className="card p-6 animate-fade-up">
              <h2 className="section-title mb-4">Top set over time</h2>
              <BodyweightChart points={chartPoints} unit={unit} />
            </section>

            {/* Session table */}
            <section className="card p-6 animate-fade-up">
              <h2 className="section-title mb-4">Session log</h2>
              <div className="space-y-1">
                <div className="grid grid-cols-4 text-[11px] uppercase tracking-wide text-muted pb-2 border-b border-border">
                  <span>Date</span>
                  <span>Top set</span>
                  <span>Est. 1RM</span>
                  <span className="text-right">Volume</span>
                </div>
                {[...h.points].reverse().map((p) => (
                  <div
                    key={p.date}
                    className="grid grid-cols-4 stat-num text-sm py-2 border-b border-border last:border-0"
                  >
                    <span className="text-muted">{p.date.slice(5)}</span>
                    <span>
                      {weightNum(p.topWeight, unit)} × {p.reps}
                    </span>
                    <span>{fmtWeight(p.best1RM, unit)}</span>
                    <span className="text-right text-muted">
                      {fmtVolume(p.volume, unit)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
