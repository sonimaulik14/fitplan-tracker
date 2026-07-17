import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  Package,
  Trophy,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getWeeklyReview } from "@/lib/metrics/review";
import {
  fmtVolume,
  fmtWeight,
  slugify,
  VOLUME_LANDMARKS,
  landmarkVerdict,
  type Unit,
} from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import PhotoHero from "@/app/components/PhotoHero";
import { MuscleGlyph } from "@/app/components/icons";

export const metadata = { title: "Weekly review" };

function DeltaChip({ curr, prev }: { curr: number; prev: number }) {
  if (prev <= 0)
    return <span className="text-xs text-muted">first week logged</span>;
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct > 2)
    return (
      <span className="chip text-success border-success/30 bg-success/10 !py-0.5">
        <TrendingUp size={12} aria-hidden /> +{pct}% vs last week
      </span>
    );
  if (pct < -2)
    return (
      <span className="chip text-warn border-warn/30 bg-warn/10 !py-0.5">
        <TrendingDown size={12} aria-hidden /> {pct}% vs last week
      </span>
    );
  return (
    <span className="chip !py-0.5">
      <Minus size={12} aria-hidden /> level with last week
    </span>
  );
}

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;

  const r = await getWeeklyReview(user.id);
  const gains = r.lifts.filter((l) => l.priorBest > 0 && l.deltaKg > 0.01);
  const topGains = gains.slice(0, 5);

  const stats = [
    {
      Icon: Dumbbell,
      label: "Workouts",
      value: String(r.workouts),
      sub: `${r.prevWorkouts} last week`,
    },
    {
      Icon: Package,
      label: "Volume",
      value: `${fmtVolume(r.volumeKg, unit)} ${unit}`,
      sub: `${fmtVolume(r.prevVolumeKg, unit)} ${unit} last week`,
    },
    {
      Icon: Trophy,
      label: "Strength PRs",
      value: String(r.prCount),
      sub: "est. 1RM records this week",
    },
  ];

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-6">
        <PhotoHero
          queryKey="hero:hero"
          eyebrow="Last 7 days"
          title="Your week in review"
          subtitle="What moved, what stalled, and where next week is won."
        />

        {r.workouts === 0 && r.prevWorkouts === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-semibold">Nothing logged yet</p>
            <p className="text-sm text-muted mt-1">
              Log a workout and this page becomes your Monday scoreboard.
            </p>
            <Link href="/workout/next" className="btn-primary inline-flex mt-4">
              Start today&apos;s session
            </Link>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-3 animate-fade-up">
              {stats.map((s) => (
                <div key={s.label} className="card p-4">
                  <s.Icon size={15} className="text-muted" aria-hidden />
                  <div className="stat-num text-xl mt-2">{s.value}</div>
                  <div className="text-[11px] uppercase tracking-wide text-muted mt-0.5">
                    {s.label}
                  </div>
                  <div className="text-xs text-muted mt-1">{s.sub}</div>
                </div>
              ))}
            </section>

            <section className="card p-5 animate-fade-up">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="section-title">Volume</h2>
                <DeltaChip curr={r.volumeKg} prev={r.prevVolumeKg} />
              </div>
              <div className="mt-4 space-y-2.5">
                {r.setsByMuscle.length === 0 && (
                  <p className="text-sm text-muted">
                    No working sets in the last 7 days.
                  </p>
                )}
                {r.setsByMuscle.map((m) => {
                  const lm = VOLUME_LANDMARKS[m.muscle];
                  const verdict = lm ? landmarkVerdict(m.sets, lm) : null;
                  return (
                    <div key={m.muscle} className="flex items-center gap-3">
                      <MuscleGlyph muscle={m.muscle} size={15} />
                      <span className="text-sm font-medium w-24 shrink-0">
                        {m.muscle}
                      </span>
                      <span className="stat-num text-sm">{m.sets} sets</span>
                      <span className="text-xs text-muted">
                        ({m.prevSets} last wk)
                      </span>
                      {verdict && (
                        <span
                          className={`ml-auto text-[11px] font-semibold ${
                            verdict.tone === "good"
                              ? "text-success"
                              : verdict.tone === "low"
                                ? "text-warn"
                                : "text-danger"
                          }`}
                        >
                          {verdict.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="card p-5 animate-fade-up">
              <h2 className="section-title">Strength moves</h2>
              {topGains.length === 0 ? (
                <p className="text-sm text-muted mt-3">
                  No estimated-1RM records this week. Deloads and consolidation
                  weeks are part of the climb — the targets page has next
                  week&apos;s numbers.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {topGains.map((l) => (
                    <Link
                      key={l.name}
                      href={`/exercise/${slugify(l.name)}`}
                      className="flex items-center gap-3 py-2 border-b border-border last:border-0 group"
                    >
                      <MuscleGlyph muscle={l.muscle} size={15} />
                      <span className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                        {l.name}
                      </span>
                      <span className="ml-auto stat-num text-sm shrink-0">
                        {fmtWeight(l.bestE1rm, unit)}
                      </span>
                      <span className="chip text-success border-success/30 bg-success/10 !py-0.5 shrink-0">
                        +{fmtWeight(l.deltaKg, unit)} e1RM
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <div className="flex gap-3">
              <Link href="/targets" className="btn-primary flex-1 text-center">
                Next week&apos;s targets →
              </Link>
              <Link href="/analysis" className="btn-ghost flex-1 text-center">
                Full analysis
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
