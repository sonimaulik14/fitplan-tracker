import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProgress } from "@/lib/metrics";
import {
  muscleStyle,
  fmtVolume,
  fmtWeight,
  VOLUME_LANDMARKS,
  landmarkVerdict,
  termInfo,
  type Unit,
} from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import InfoTip from "@/app/components/InfoTip";
import PhotoHero from "@/app/components/PhotoHero";
import { MuscleGlyph } from "@/app/components/icons";
import { AnimatedRing, AnimatedNumber } from "@/app/components/motion";

export const metadata = { title: "Analysis" };

export default async function AnalysisPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;
  const p = await getProgress(user.id);

  if (!p || !p.enrolled) {
    return (
      <>
        <NavBar user={user} />
        <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28">
          <h1 className="text-2xl font-bold">Analysis</h1>
          <div className="card p-8 mt-6 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-muted">
              Start the plan and log a few workouts to unlock your analysis.
            </p>
            <Link href="/dashboard" className="btn-primary mt-5">
              Go to dashboard
            </Link>
          </div>
        </main>
      </>
    );
  }

  const muscles = Object.keys(p.setsByMuscle).sort();
  const maxVolume = Math.max(1, ...Object.values(p.volumeByMuscle));
  const maxWeekVol = Math.max(1, ...p.weekly.map((x) => x.volume));

  // Weekly working-set landmarks: average done sets/week per muscle vs MEV–MRV.
  const weeksTrained = Math.max(
    1,
    p.weekly.filter((w) => w.doneSets > 0).length
  );
  const landmarks = muscles
    .filter((m) => VOLUME_LANDMARKS[m])
    .map((m) => {
      const l = VOLUME_LANDMARKS[m];
      const weekly = (p.setsByMuscle[m].done ?? 0) / weeksTrained;
      return { muscle: m, weekly, l, verdict: landmarkVerdict(weekly, l) };
    });

  // Per-style breakdown: aggregate the weekly rows by training style (the
  // program rotates YT3 / Y3T / FST-7 / GVT / HIT / DTP Extreme across blocks).
  const styleAgg = new Map<
    string,
    {
      weeks: number[];
      doneSets: number;
      prescribedSets: number;
      completedWorkouts: number;
      prescribedWorkouts: number;
      volume: number;
    }
  >();
  for (const w of p.weekly) {
    const key = w.style ?? "—";
    const a =
      styleAgg.get(key) ??
      {
        weeks: [],
        doneSets: 0,
        prescribedSets: 0,
        completedWorkouts: 0,
        prescribedWorkouts: 0,
        volume: 0,
      };
    a.weeks.push(w.weekNumber);
    a.doneSets += w.doneSets;
    a.prescribedSets += w.prescribedSets;
    a.completedWorkouts += w.completedWorkouts;
    a.prescribedWorkouts += w.prescribedWorkouts;
    a.volume += w.volume;
    styleAgg.set(key, a);
  }
  const pctOf = (a: number, b: number) =>
    b === 0 ? 0 : Math.round((a / b) * 100);
  const styles = [...styleAgg.entries()]
    .map(([style, a]) => ({
      style,
      weeks: a.weeks.sort((x, y) => x - y),
      setAdherence: pctOf(a.doneSets, a.prescribedSets),
      workoutAdherence: pctOf(a.completedWorkouts, a.prescribedWorkouts),
      doneSets: a.doneSets,
      volume: a.volume,
      info: termInfo(style),
    }))
    .filter((s) => s.style !== "—")
    .sort((a, b) => a.weeks[0] - b.weeks[0]);
  const maxStyleVol = Math.max(1, ...styles.map((s) => s.volume));

  // ---- Insights band: turn the dense data below into a plain-language summary ----
  const trained = p.weekly.filter((w) => w.doneSets > 0);
  const lastWk = trained[trained.length - 1];
  const prevWk = trained[trained.length - 2];
  const volTrend =
    lastWk && prevWk && prevWk.volume > 0
      ? Math.round(((lastWk.volume - prevWk.volume) / prevWk.volume) * 100)
      : null;

  const muscleCompletion = muscles
    .map((m) => ({
      muscle: m,
      pct: p.setsByMuscle[m].prescribed
        ? p.setsByMuscle[m].done / p.setsByMuscle[m].prescribed
        : 0,
      done: p.setsByMuscle[m].done,
    }))
    .filter((x) => x.done > 0);
  const best = [...muscleCompletion].sort((a, b) => b.pct - a.pct)[0];
  const worst = [...muscleCompletion].sort((a, b) => a.pct - b.pct)[0];

  const narrative = [
    `You've completed ${p.completedWorkouts} of ${p.prescribedWorkouts} workouts at ${p.workoutAdherence}% adherence.`,
    volTrend !== null
      ? volTrend >= 0
        ? `Volume is up ${volTrend}% week-over-week — keep that momentum.`
        : `Volume dipped ${Math.abs(volTrend)}% this week; an easy win is to recover the lost sets.`
      : null,
    best && worst && best.muscle !== worst.muscle
      ? `Strongest area is ${best.muscle}; give ${worst.muscle} some extra attention.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const insights: {
    icon: string;
    value: string;
    label: string;
    color: string;
  }[] = [
    {
      icon: "✅",
      value: `${p.completedWorkouts}/${p.prescribedWorkouts}`,
      label: "Workouts done",
      color: "var(--success)",
    },
    {
      icon: volTrend !== null && volTrend < 0 ? "📉" : "📈",
      value:
        volTrend !== null
          ? `${volTrend >= 0 ? "+" : ""}${volTrend}%`
          : fmtVolume(p.totalVolume, unit),
      label: volTrend !== null ? "Volume vs last wk" : `${unit} lifted total`,
      color: volTrend !== null && volTrend < 0 ? "var(--danger)" : "var(--success)",
    },
    {
      icon: "🔥",
      value: `${p.currentStreak}`,
      label: "Day streak",
      color: "var(--warn)",
    },
    {
      icon: "🏆",
      value: `${p.prs.length}`,
      label: "Personal records",
      color: "var(--pr)",
    },
  ];

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-8">
        <PhotoHero
          queryKey="page:analysis"
          title="Analysis"
          subtitle={`How closely you're following ${p.plan.name}.`}
        />

        {/* Insights — the dense charts below, in one glance */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title">Highlights</h2>
          {narrative && (
            <p className="text-sm text-muted mt-2.5 leading-relaxed max-w-2xl">
              {narrative}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {insights.map((it) => (
              <div
                key={it.label}
                className="rounded-xl border border-border bg-surface-2 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{it.icon}</span>
                  <span
                    className="text-2xl font-display font-bold"
                    style={{ color: it.color }}
                  >
                    {it.value}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1.5">{it.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Rings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up">
          <RingCard
            pct={p.workoutAdherence}
            color="var(--accent)"
            title="Workout adherence"
            sub={`${p.completedWorkouts} of ${p.prescribedWorkouts} workouts`}
          />
          <RingCard
            pct={p.setAdherence}
            color="var(--accent-2)"
            title="Set completion"
            sub={`${p.doneSetsTotal} of ${p.prescribedSetsTotal} sets`}
          />
          <RingCard
            pct={p.repQuality}
            color="var(--accent-3)"
            title="Rep quality"
            sub={`${p.workingSetsOnTarget} of ${p.workingSetsDone} on target`}
          />
        </div>

        {/* Weekly trend */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title">Weekly trend</h2>
          <p className="text-xs text-muted mt-0.5 mb-5">
            Set completion and training volume per week.
          </p>
          <div className="flex items-end gap-1.5 sm:gap-4 h-44">
            {p.weekly.map((w) => (
              <div
                key={w.weekNumber}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div className="flex items-end gap-0.5 sm:gap-1.5 h-32 w-full justify-center">
                  <Bar
                    heightPct={w.setAdherence}
                    className="bg-gradient-to-t from-accent-2/60 to-accent-2"
                    title={`Set completion ${w.setAdherence}%`}
                  />
                  <Bar
                    heightPct={(w.volume / maxWeekVol) * 100}
                    className="bg-gradient-to-t from-accent/60 to-accent-hi"
                    title={`Volume ${Math.round(w.volume).toLocaleString()}`}
                  />
                </div>
                <div className="text-xs text-muted">W{w.weekNumber}</div>
              </div>
            ))}
          </div>
          <Legend
            items={[
              { c: "var(--accent-2)", label: "Set completion %" },
              { c: "var(--accent)", label: "Volume" },
            ]}
          />
        </section>

        {/* Per-style breakdown */}
        {styles.length > 0 && (
          <section className="card p-6 animate-fade-up">
            <h2 className="section-title">Breakdown by training style</h2>
            <p className="text-xs text-muted mt-0.5 mb-5">
              How each protocol block went. Tap a style for what it means.
            </p>
            <div className="space-y-4">
              {styles.map((s) => (
                <div
                  key={s.style}
                  className="rounded-xl border border-border bg-surface-2 p-4"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {s.info ? (
                        <InfoTip
                          title={s.info.title}
                          desc={s.info.desc}
                          className="text-accent"
                        >
                          <span className="chip text-accent border-accent/30 bg-accent/10">
                            {s.style} ⓘ
                          </span>
                        </InfoTip>
                      ) : (
                        <span className="chip text-accent border-accent/30 bg-accent/10">
                          {s.style}
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {s.weeks.length} week{s.weeks.length === 1 ? "" : "s"} · W
                        {s.weeks.join(", W")}
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {s.doneSets} sets · {fmtVolume(s.volume, unit)} {unit}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <StyleMeter
                      label="Set completion"
                      pct={s.setAdherence}
                      color="var(--accent-2)"
                    />
                    <StyleMeter
                      label="Workouts done"
                      pct={s.workoutAdherence}
                      color="var(--accent)"
                    />
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-muted mb-1">
                      <span>Volume share</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hi"
                        style={{ width: `${(s.volume / maxStyleVol) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Set completion by muscle */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title mb-5">Set completion by muscle</h2>
          <div className="space-y-4">
            {muscles.map((m) => {
              const s = p.setsByMuscle[m];
              const pct = s.prescribed
                ? Math.round((s.done / s.prescribed) * 100)
                : 0;
              const st = muscleStyle(m);
              return (
                <div key={m}>
                  <div className="flex justify-between items-center text-sm mb-1.5">
                    <span className="flex items-center gap-2">
                      <MuscleGlyph muscle={m} size={15} />
                      {m}
                    </span>
                    <span className="text-muted">
                      {s.done}/{s.prescribed} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: st.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Weekly volume landmarks */}
        {landmarks.length > 0 && (
          <section className="card p-6 animate-fade-up">
            <h2 className="section-title">Weekly volume landmarks</h2>
            <p className="text-xs text-muted mt-0.5 mb-5">
              Avg working sets per muscle each week vs the productive range (MEV →
              MRV), over {weeksTrained} trained week
              {weeksTrained === 1 ? "" : "s"}.
            </p>
            <div className="space-y-5">
              {landmarks.map(({ muscle, weekly, l, verdict }) => {
                const st = muscleStyle(muscle);
                const scale = l.mrv * 1.25;
                const pos = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
                const toneColor =
                  verdict.tone === "good"
                    ? "var(--success)"
                    : verdict.tone === "high"
                      ? "var(--danger)"
                      : "var(--warn)";
                return (
                  <div key={muscle}>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="flex items-center gap-2">
                        <MuscleGlyph muscle={muscle} size={15} />
                        {muscle}
                        <span className="text-muted">
                          {weekly.toFixed(1)} sets/wk
                        </span>
                      </span>
                      <span
                        className="chip border"
                        style={{ color: toneColor, borderColor: `${toneColor}55` }}
                      >
                        {verdict.label}
                      </span>
                    </div>
                    <div className="relative h-3 rounded-full bg-surface-2">
                      {/* productive band MEV→MRV */}
                      <div
                        className="absolute inset-y-0 rounded-full bg-accent-2/15"
                        style={{
                          left: pos(l.mev),
                          right: `${100 - Math.min(100, (l.mrv / scale) * 100)}%`,
                        }}
                      />
                      {/* current fill */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all"
                        style={{ width: pos(weekly), background: toneColor }}
                      />
                      {/* MEV / MAV / MRV ticks */}
                      {[
                        ["MEV", l.mev],
                        ["MAV", l.mav],
                        ["MRV", l.mrv],
                      ].map(([label, n]) => (
                        <div
                          key={label as string}
                          className="absolute -bottom-4 -translate-x-1/2 text-[9px] text-muted"
                          style={{ left: pos(n as number) }}
                        >
                          <span className="block w-px h-2 bg-border mx-auto -mt-[18px]" />
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="h-4" />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Volume by muscle */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title">Training volume by muscle</h2>
          <p className="text-xs text-muted mt-0.5 mb-5">
            Volume = weight × reps across logged sets (cardio excluded).
          </p>
          {p.totalVolume === 0 ? (
            <p className="text-muted text-sm">
              No weighted sets logged yet — enter weight × reps on the workout
              screen to build this chart.
            </p>
          ) : (
            <div className="space-y-4">
              {muscles
                .filter((m) => (p.volumeByMuscle[m] ?? 0) > 0)
                .sort(
                  (a, b) => (p.volumeByMuscle[b] ?? 0) - (p.volumeByMuscle[a] ?? 0)
                )
                .map((m) => {
                  const v = p.volumeByMuscle[m] ?? 0;
                  const st = muscleStyle(m);
                  return (
                    <div key={m}>
                      <div className="flex justify-between items-center text-sm mb-1.5">
                        <span className="flex items-center gap-2">
                          <MuscleGlyph muscle={m} size={15} />
                          {m}
                        </span>
                        <span className="text-muted">
                          {fmtVolume(v, unit)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(v / maxVolume) * 100}%`,
                            background: st.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* PRs */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title">Personal records</h2>
          <p className="text-xs text-muted mt-0.5 mb-4">
            Heaviest weight logged per exercise.
          </p>
          {p.prs.length === 0 ? (
            <p className="text-muted text-sm">
              Log weight × reps on your working sets to start tracking PRs.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {p.prs.slice(0, 12).map((pr) => {
                const st = muscleStyle(pr.muscle);
                return (
                  <Link
                    key={pr.name}
                    href={`/exercise/${encodeURIComponent(pr.name)}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 border border-border px-3.5 py-2.5 hover:border-accent/40 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm min-w-0">
                      <MuscleGlyph muscle={pr.muscle} size={15} />
                      <span className="truncate">{pr.name}</span>
                    </span>
                    <span className="font-display font-bold whitespace-nowrap">
                      {fmtWeight(pr.maxWeight, unit)} × {pr.repsAtMax} →
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Workout-by-workout */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title mb-4">Workout-by-workout</h2>
          <div className="space-y-1">
            {p.days.map((d, i) => {
              const pct = d.prescribedSets
                ? Math.round((d.doneSets / d.prescribedSets) * 100)
                : 0;
              return (
                <Link
                  key={d.dayId}
                  href={`/workout/${d.dayId}`}
                  className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:text-accent transition-colors"
                >
                  <span className="text-xs text-muted w-8">D{i + 1}</span>
                  <span className="text-sm flex-1 truncate">{d.focus}</span>
                  <div className="w-24 h-1.5 rounded-full bg-surface-2 overflow-hidden hidden sm:block">
                    <div
                      className="h-full rounded-full bg-accent-2"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted w-20 text-right">
                    {d.doneSets}/{d.prescribedSets} · {pct}%
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

function RingCard({
  pct,
  color,
  title,
  sub,
}: {
  pct: number;
  color: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="card p-6 flex flex-col items-center text-center">
      <AnimatedRing pct={pct} size={128} stroke={12} color={color}>
        <div className="text-3xl font-display font-bold num-gradient">
          <AnimatedNumber value={pct} suffix="%" />
        </div>
      </AnimatedRing>
      <div className="font-semibold mt-4">{title}</div>
      <div className="text-xs text-muted mt-1">{sub}</div>
    </div>
  );
}

function StyleMeter({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-muted mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Bar({
  heightPct,
  className,
  title,
}: {
  heightPct: number;
  className: string;
  title: string;
}) {
  return (
    <div
      className={`w-2.5 sm:w-4 rounded-t-md ${className}`}
      style={{ height: `${Math.max(2, heightPct)}%` }}
      title={title}
    />
  );
}

function Legend({ items }: { items: { c: string; label: string }[] }) {
  return (
    <div className="flex gap-4 mt-4 text-xs text-muted">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded"
            style={{ background: it.c }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
