import { Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProgress, getActivity, buildAchievements } from "@/lib/metrics";
import NavBar from "@/app/components/NavBar";
import Certificate from "@/app/components/Certificate";
import PhotoHero from "@/app/components/PhotoHero";
import { AchievementBadge } from "@/app/components/icons";

export const metadata = { title: "Achievements" };

export default async function AchievementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const p = await getProgress(user.id);
  if (!p || !p.enrolled) {
    return (
      <>
        <NavBar user={user} />
        <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28">
          <h1 className="display-hero text-3xl">Achievements</h1>
          <div className="card p-8 mt-6 text-center text-muted">
            Start the plan and log a workout to begin earning badges.
          </div>
        </main>
      </>
    );
  }

  const activity = await getActivity(user.id);
  const achievements = buildAchievements(p, activity, p.prs.length);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  const now = new Date();

  const planComplete =
    p.weeksSeeded === p.totalWeeks &&
    p.prescribedWorkouts > 0 &&
    p.completedWorkouts >= p.prescribedWorkouts;

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-8">
        <PhotoHero
          queryKey="page:achievements"
          title="Achievements"
          subtitle={`${unlocked} of ${achievements.length} badges · ${activity.totalActiveDays} active days · best streak ${activity.longest}`}
        />

        {/* Certificate */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title mb-4">12-week certificate</h2>
          {planComplete ? (
            <Certificate
              name={user.name || user.email}
              planName={p.plan.name}
              totalWeeks={p.totalWeeks}
              workouts={p.completedWorkouts}
              sets={p.doneSetsTotal}
              dateLabel={now.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          ) : (
            <div className="text-center py-4">
              <Lock className="w-9 h-9 mx-auto text-muted/50" strokeWidth={1.75} aria-hidden />
              <p className="text-muted text-sm mt-3">
                Finish every workout across all {p.totalWeeks} weeks to unlock
                your downloadable completion certificate.
              </p>
              <div className="max-w-xs mx-auto mt-4">
                <div className="flex justify-between text-xs text-muted mb-1.5">
                  <span>Workouts complete</span>
                  <span>
                    {p.completedWorkouts}/{p.prescribedWorkouts || "—"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: "var(--grad-brand)",
                      width: `${
                        p.prescribedWorkouts
                          ? Math.round(
                              (p.completedWorkouts / p.prescribedWorkouts) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                {p.weeksSeeded < p.totalWeeks && (
                  <p className="text-[11px] text-muted mt-2">
                    {p.weeksSeeded} of {p.totalWeeks} weeks released so far.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Badges */}
        <section className="animate-fade-up">
          <h2 className="section-title mb-4">Badges</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 stagger">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`card p-4 text-center transition-all ${
                  a.unlocked ? "" : "opacity-60"
                }`}
              >
                <div className="flex justify-center">
                  <AchievementBadge id={a.id} unlocked={a.unlocked} size={56} />
                </div>
                <div className="font-semibold text-sm mt-2.5">{a.title}</div>
                <div className="text-xs text-muted mt-0.5">{a.desc}</div>
                {a.unlocked && (
                  <div className="chip text-accent-2 border-accent-2/30 bg-accent-2/10 mt-2.5 inline-flex">
                    Unlocked
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
