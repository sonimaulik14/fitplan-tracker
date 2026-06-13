import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getProgress,
  getActivity,
  getBodyweightSeries,
  getProgressPhotos,
  buildAchievements,
} from "@/lib/metrics";
import NavBar from "@/app/components/NavBar";
import BodyweightChart from "@/app/components/BodyweightChart";
import {
  WeighInForm,
  PhotoUploader,
  DeletePhotoButton,
} from "@/app/components/ProgressClient";
import { Reveal, AnimatedNumber } from "@/app/components/motion";
import ShareCard from "@/app/components/ShareCard";
import PhotoCompare from "@/app/components/PhotoCompare";
import PhotoHero from "@/app/components/PhotoHero";
import { AchievementBadge } from "@/app/components/icons";
import { fmtVolume, type Unit } from "@/lib/ui";

function recapMessage(pct: number, completed: boolean): string {
  if (completed)
    return "🔥 Perfect week — every session done. Bump the weight a little next week.";
  if (pct >= 60)
    return "Strong week. Close out the last sessions to complete it.";
  if (pct > 0)
    return "Momentum dipped — rebuild it one workout at a time. You've got this.";
  return "New week, fresh start. Log your first session today.";
}

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;

  const [p, activity, bw, photos] = await Promise.all([
    getProgress(user.id),
    getActivity(user.id),
    getBodyweightSeries(user.id),
    getProgressPhotos(user.id),
  ]);

  const achievements = p
    ? buildAchievements(p, activity, p.prs.length)
    : [];
  const unlocked = achievements.filter((a) => a.unlocked).length;

  // Most recent week with activity (for the recap), else first week.
  const recapWeek =
    p?.weekly
      .slice()
      .reverse()
      .find((w) => w.doneSets > 0) ??
    p?.weekly[0] ??
    null;

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-8">
        <PhotoHero
          queryKey="page:progress"
          title="Progress"
          subtitle="Your consistency, milestones and body."
        />

        {/* 12-Week Wrapped entry */}
        {p?.enrolled && activity.totalActiveDays > 0 && (
          <Link
            href="/wrapped"
            className="relative block overflow-hidden rounded-2xl p-5 animate-fade-up active:scale-[0.99] transition-transform"
            style={{ background: "var(--accent)" }}
          >
            <div className="flex items-center justify-between gap-3 text-white">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/80">
                  New
                </div>
                <div className="font-display font-bold text-xl mt-0.5">
                  🎬 Your 12-Week Wrapped
                </div>
                <div className="text-white/85 text-sm mt-0.5">
                  A swipeable recap of your season — tap to play.
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white text-[#1a1d29] font-semibold text-sm px-4 py-2">
                Play →
              </span>
            </div>
          </Link>
        )}

        {/* Streak stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
          <StreakStat icon="🔥" value={activity.current} label="Day streak" big />
          <StreakStat icon="🏅" value={activity.longest} label="Longest streak" />
          <StreakStat
            icon="📅"
            value={activity.totalActiveDays}
            label="Active days"
          />
          <StreakStat icon="⚡" value={activity.thisWeek} label="This week" />
        </div>

        {/* Weekly recap */}
        {p && recapWeek && (
          <Reveal>
            <section className="relative overflow-hidden card p-6">
              <div className="flex items-center justify-between">
                <h2 className="section-title">
                  Week {recapWeek.weekNumber}
                  {recapWeek.style ? ` : ${recapWeek.style}` : ""} recap
                </h2>
                {recapWeek.completed && (
                  <span className="chip text-accent-2 border-accent-2/30 bg-accent-2/10">
                    ✓ Complete
                  </span>
                )}
              </div>
              <p className="text-sm mt-2">
                {recapMessage(recapWeek.trainingPct, recapWeek.completed)}
              </p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <RecapStat
                  label="Workouts"
                  value={`${recapWeek.trainingDone}/${recapWeek.trainingDays}`}
                />
                <RecapStat label="Set completion" value={`${recapWeek.setAdherence}%`} />
                <RecapStat
                  label={`Volume (${unit})`}
                  value={fmtVolume(recapWeek.volume, unit)}
                />
              </div>
            </section>
          </Reveal>
        )}

        {/* Weekly completion */}
        {p && (
          <Reveal>
            <section className="card p-6">
              <h2 className="section-title mb-1">Program weeks</h2>
              <p className="text-xs text-muted mb-5">
                Each week is complete when every training day is done.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: p.totalWeeks }, (_, i) => i + 1).map(
                  (wn) => {
                    const wk = p.weekly.find((w) => w.weekNumber === wn);
                    const loaded = !!wk;
                    const done = wk?.completed ?? false;
                    return (
                      <div
                        key={wn}
                        className={`rounded-xl border p-4 ${
                          done
                            ? "border-accent-2/40 bg-accent-2/5"
                            : loaded
                              ? "border-border bg-surface-2"
                              : "border-border bg-surface-2 opacity-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold">
                            Week {wn}
                            {wk?.style ? (
                              <span className="text-accent text-sm">
                                {" "}
                                : {wk.style}
                              </span>
                            ) : null}
                          </span>
                          {done ? (
                            <span className="grid place-items-center w-6 h-6 rounded-full bg-accent-2 text-[#05231a] text-xs font-bold">
                              ✓
                            </span>
                          ) : loaded ? (
                            <span className="text-xs text-muted">
                              {wk!.trainingPct}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted">🔒</span>
                          )}
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-3 border border-border/50">
                          <div
                            className={`h-full rounded-full ${
                              done ? "bg-accent-2" : "bg-accent"
                            }`}
                            style={{ width: `${wk?.trainingPct ?? 0}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted mt-2">
                          {loaded
                            ? `${wk!.trainingDone}/${wk!.trainingDays} workouts`
                            : "Not loaded yet"}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          </Reveal>
        )}

        {/* Achievements */}
        {p && (
          <Reveal>
            <section className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="section-title">Achievements</h2>
                <span className="chip">
                  {unlocked}/{achievements.length} unlocked
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {achievements.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-4 flex items-center gap-3 transition-all ${
                      a.unlocked
                        ? "border-accent/40 bg-accent/5"
                        : "border-border bg-surface-2 opacity-55"
                    }`}
                  >
                    <AchievementBadge id={a.id} unlocked={a.unlocked} size={40} />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {a.title}
                      </div>
                      <div className="text-xs text-muted leading-snug">
                        {a.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Bodyweight */}
        <Reveal>
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="section-title">Bodyweight</h2>
              <WeighInForm unit={unit} />
            </div>
            <BodyweightChart points={bw} unit={unit} />
          </section>
        </Reveal>

        {/* Progress photos */}
        <Reveal>
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h2 className="section-title">Progress photos</h2>
                <p className="text-xs text-muted mt-0.5">
                  Stored privately on your account.
                </p>
              </div>
              <PhotoUploader />
            </div>

            {photos.length === 0 ? (
              <p className="text-sm text-muted">
                Add your first photo to start your before / after.
              </p>
            ) : (
              <>
                {photos.length >= 2 && (
                  <PhotoCompare
                    photos={photos.map((ph) => ({
                      id: ph.id,
                      dataUrl: ph.dataUrl,
                      date: ph.date.toISOString(),
                    }))}
                    bw={bw}
                    unit={unit}
                  />
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {photos.map((ph) => (
                    <div
                      key={ph.id}
                      className="relative rounded-xl overflow-hidden aspect-[3/4] border border-border"
                    >
                      <DeletePhotoButton id={ph.id} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ph.dataUrl}
                        alt="progress"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </Reveal>

        {/* Share + export */}
        {p && (
          <Reveal>
            <section className="card p-6">
              <h2 className="section-title mb-1">Share your progress</h2>
              <p className="text-xs text-muted mb-5">
                Generate a card to post, or export all your data.
              </p>
              <ShareCard
                name={user.name}
                planName={p.plan.name}
                adherence={p.workoutAdherence}
                setAdherence={p.setAdherence}
                repQuality={p.repQuality}
                streak={activity.current}
                volume={p.totalVolume}
                prs={p.prs.length}
                completedWorkouts={p.completedWorkouts}
                unit={unit}
              />
              <div className="mt-5 pt-5 border-t border-border">
                <a href="/api/export" className="btn-ghost !py-2" download>
                  ⬇ Export all data (CSV)
                </a>
              </div>
            </section>
          </Reveal>
        )}
      </main>
    </>
  );
}

function RecapStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 border border-border p-3">
      <div className="font-display font-bold text-lg">{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}

function StreakStat({
  icon,
  value,
  label,
  big,
}: {
  icon: string;
  value: number;
  label: string;
  big?: boolean;
}) {
  return (
    <div
      className="card p-4 relative overflow-hidden"
      style={
        big
          ? { background: "var(--grad-brand-soft)" }
          : undefined
      }
    >
      <div className="text-2xl">{icon}</div>
      <div
        className={`font-display font-bold mt-1 ${
          big ? "num-brand text-4xl sm:text-5xl leading-none" : "num-gradient text-2xl"
        }`}
      >
        <AnimatedNumber value={value} />
      </div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}
