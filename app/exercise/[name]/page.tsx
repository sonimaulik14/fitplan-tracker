import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseHistory } from "@/lib/metrics";
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
  const name = decodeURIComponent(raw);
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;

  const h = await getExerciseHistory(user.id, name);
  const st = muscleStyle(h.muscle);
  const standard =
    h.best1RM > 0
      ? strengthStandard(h.best1RM, h.latestBwKg, name)
      : null;

  // weight-trend points for the chart (top set per session)
  const chartPoints = h.points.map((p) => ({ date: p.date, weight: p.topWeight }));

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-6">
        <Link
          href="/analysis"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          ← Back to analysis
        </Link>

        <div className="flex items-center gap-3 animate-fade-up">
          <span
            className="w-1.5 h-10 rounded-full"
            style={{ background: st.color }}
          />
          <div>
            <div className="text-xs uppercase tracking-wide text-muted flex items-center gap-1.5">
              <MuscleGlyph muscle={h.muscle} size={14} /> {h.muscle}
            </div>
            <h1 className="text-2xl font-bold">{name}</h1>
          </div>
        </div>

        {/* Demo media — real clip if available, else muscle visual + video link */}
        <ExerciseDemoHero name={name} muscle={h.muscle} />

        {h.points.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            No logged sets for this exercise yet.
          </div>
        ) : (
          <>
            {/* Stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-up">
              <div className="card p-4">
                <div className="text-xs text-muted">Best est. 1RM</div>
                <div className="text-2xl font-display font-bold mt-1">
                  {fmtWeight(h.best1RM, unit)}
                </div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-muted">Sessions</div>
                <div className="text-2xl font-display font-bold mt-1">
                  {h.points.length}
                </div>
              </div>
              {standard && (
                <div className="card p-4">
                  <div className="text-xs text-muted">Strength level</div>
                  <div className="text-2xl font-display font-bold mt-1">
                    {standard.level}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {standard.ratio}× bodyweight
                  </div>
                </div>
              )}
            </div>

            {/* Plateau banner */}
            {h.plateau && (
              <div className="card p-4 border border-amber-400/30 bg-amber-400/5 text-sm animate-fade-up">
                ⚠️ <span className="font-semibold">Plateau detected</span> — your
                estimated 1RM hasn&apos;t improved in 3 sessions. Consider a
                deload week, a rep-range change, or an exercise swap.
              </div>
            )}

            {/* Weight trend */}
            <section className="card p-6 animate-fade-up">
              <h2 className="font-bold mb-4">Top set over time</h2>
              <BodyweightChart points={chartPoints} unit={unit} />
            </section>

            {/* Session table */}
            <section className="card p-6 animate-fade-up">
              <h2 className="font-bold mb-4">Session log</h2>
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
                    className="grid grid-cols-4 text-sm py-2 border-b border-border last:border-0"
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
