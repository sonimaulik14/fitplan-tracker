import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getProgress, getLastTimeByExercise, getPlateaus } from "@/lib/metrics";
import { fmtWeight, type Unit } from "@/lib/ui";
import { prescribe } from "@/lib/progression";
import NavBar from "@/app/components/NavBar";
import PhotoHero from "@/app/components/PhotoHero";
import { MuscleGlyph } from "@/app/components/icons";

export const metadata = { title: "This week's targets" };

const toneCls: Record<string, string> = {
  up: "text-success border-success/30 bg-success/10",
  beat: "text-accent border-accent/30 bg-accent/10",
  hold: "text-warn border-warn/30 bg-warn/10",
  deload: "text-warn border-warn/30 bg-warn/10",
};

export default async function TargetsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;

  const p = await getProgress(user.id);
  if (!p || !p.enrolled || !p.plan) redirect("/dashboard");

  const [lastTime, plateaus] = await Promise.all([
    getLastTimeByExercise(user.id, p.plan.id, ""),
    getPlateaus(user.id),
  ]);
  const plateauByName = new Map(plateaus.map((pl) => [pl.name, pl]));

  // The week containing the next unfinished training day.
  const next =
    p.days.find(
      (d) => d.status !== "completed" && !d.focus.toLowerCase().includes("rest")
    ) ??
    p.days.find((d) => d.status !== "completed") ??
    p.days[0];
  const currentWeek = next?.weekNumber ?? p.weekly[0]?.weekNumber ?? 1;
  const week = p.plan.weeks.find((w) => w.number === currentWeek);
  const trainingDays = (week?.days ?? []).filter(
    (d) => !d.focus.toLowerCase().includes("rest")
  );

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-6">
        <PhotoHero
          queryKey="hero:hero"
          eyebrow={`Week ${currentWeek}${week?.style ? ` · ${week.style}` : ""}`}
          title="This week's targets"
          subtitle="Suggested weights from last time + your rep targets. Beat these."
        />

        {trainingDays.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            No training days in this week.
          </div>
        ) : (
          trainingDays.map((day) => {
            const lifts = day.exercises.filter((e) => !e.isCardio);
            return (
              <section key={day.id} className="card p-5 animate-fade-up">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold">{day.focus}</h2>
                  <Link
                    href={`/workout/${day.id}`}
                    className="text-xs text-accent font-semibold hover:underline"
                  >
                    Open →
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {lifts.map((ex) => {
                    const last = lastTime[ex.name] ?? null;
                    const plateau = plateauByName.get(ex.name);
                    const sug = prescribe({
                      last,
                      repTarget: ex.repTarget,
                      isCardio: ex.isCardio,
                      plateau: plateau
                        ? {
                            deloadKg: plateau.deloadKg,
                            sessionsStalled: plateau.sessionsStalled,
                          }
                        : null,
                    });
                    return (
                      <div
                        key={ex.id}
                        className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                      >
                        <MuscleGlyph muscle={ex.muscle} size={15} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {ex.name}
                          </div>
                          <div className="text-xs text-muted">
                            {last
                              ? `Last: ${fmtWeight(last.weight, unit)} × ${last.reps}`
                              : `Target ${ex.repTarget} reps · no history yet`}
                          </div>
                        </div>
                        {sug ? (
                          <div className="text-right shrink-0">
                            <div className="stat-num text-sm">
                              {fmtWeight(sug.weight, unit)} × {sug.reps}
                            </div>
                            <span
                              className={`chip border !py-0 mt-0.5 ${toneCls[sug.tone] ?? ""}`}
                            >
                              {sug.label}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted shrink-0">
                            log to get a target
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>
    </>
  );
}
