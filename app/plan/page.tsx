import Link from "next/link";
import { BookOpen, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProgress } from "@/lib/metrics";
import { resetProgramAction } from "@/lib/actions";
import { muscleStyle, focusKey, termInfo, GLOSSARY } from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import DangerButton from "@/app/components/DangerButton";
import ExImage from "@/app/components/ExImage";
import InfoTip from "@/app/components/InfoTip";
import PhotoHero from "@/app/components/PhotoHero";

export const metadata = { title: "Plan" };

export default async function PlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const p = await getProgress(user.id);
  const plan = p?.plan;

  // status per day + the "up next" training day
  const statusByDay = new Map(p?.days.map((d) => [d.dayId, d.status]) ?? []);
  const nextDay =
    p?.days.find(
      (d) => d.status !== "completed" && !d.focus.toLowerCase().includes("rest")
    ) ?? p?.days.find((d) => d.status !== "completed");

  // Distinct training styles in week order, with which weeks use each, for the
  // legend (the program rotates protocols across blocks).
  const styleLegend: { style: string; weeks: number[]; info: ReturnType<typeof termInfo> }[] = [];
  for (const w of plan?.weeks ?? []) {
    if (!w.style) continue;
    const existing = styleLegend.find((s) => s.style === w.style);
    if (existing) existing.weeks.push(w.number);
    else styleLegend.push({ style: w.style, weeks: [w.number], info: termInfo(w.style) });
  }

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <PhotoHero
          queryKey="page:plan"
          eyebrow={`${plan?.totalWeeks ?? 12}-week program`}
          title={plan?.name ?? "Your plan"}
          subtitle={plan?.description ?? undefined}
        />
        <div className="mt-6 flex items-center gap-2 flex-wrap">
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent hover:bg-accent/20 active:scale-[0.98] transition-all"
          >
            <BookOpen size={15} /> Browse exercise library
          </Link>
          <Link
            href="/plans"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3.5 py-2 text-sm font-medium text-muted hover:text-foreground hover:border-border-strong transition-colors"
          >
            <RefreshCw size={15} /> Change program
          </Link>
        </div>

        {!plan && (
          <div className="card p-8 mt-6 text-center text-muted">
            No plan is loaded yet.
          </div>
        )}

        {/* Calendar overview */}
        {plan && plan.weeks.length > 0 && (
          <section className="card p-5 mt-6">
            <h2 className="section-title mb-4">Calendar</h2>
            <div className="space-y-1.5">
              {plan.weeks.map((week) => (
                <div key={week.id} className="flex items-center gap-2">
                  <span className="w-8 text-xs text-muted shrink-0">
                    W{week.number}
                  </span>
                  <div className="flex gap-1.5 flex-1">
                    {week.days.map((day) => {
                      const status = statusByDay.get(day.id) ?? "not_started";
                      const rest = day.focus.toLowerCase().includes("rest");
                      const cls =
                        status === "completed"
                          ? "bg-accent-2 border-accent-2 text-[#05231a]"
                          : status === "in_progress"
                            ? "bg-amber-400/20 border-amber-400/40 text-amber-300"
                            : rest
                              ? "bg-surface-2 border-border text-muted/50"
                              : nextDay?.dayId === day.id
                                ? "border-accent text-accent"
                                : "bg-surface-2 border-border text-muted";
                      return (
                        <Link
                          key={day.id}
                          href={`/workout/${day.id}`}
                          title={`Day ${(week.number - 1) * 7 + day.dayNumber} — ${day.focus}`}
                          className={`flex-1 h-9 rounded-lg border grid place-items-center text-[11px] font-semibold transition-transform hover:scale-105 ${cls}`}
                        >
                          {status === "completed" ? "✓" : rest ? "·" : (week.number - 1) * 7 + day.dayNumber}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Training-style legend */}
        {styleLegend.length > 0 && (
          <section className="card p-5 mt-6">
            <h2 className="section-title mb-1">Training styles</h2>
            <p className="text-xs text-muted mb-4">
              This program rotates protocols across blocks — here&apos;s the key.
            </p>
            <dl className="space-y-2.5">
              {styleLegend.map((s) => (
                <div
                  key={s.style}
                  className="rounded-xl bg-surface-2 border border-border px-4 py-3"
                >
                  <dt className="flex items-center gap-2 flex-wrap">
                    <span className="chip text-accent border-accent/30 bg-accent/10">
                      {s.style}
                    </span>
                    <span className="text-[11px] text-muted">
                      Week{s.weeks.length === 1 ? "" : "s"} {s.weeks.join(", ")}
                    </span>
                  </dt>
                  {s.info && (
                    <dd className="text-sm text-muted mt-1.5 leading-relaxed">
                      <span className="font-semibold text-foreground">
                        {s.info.title}.
                      </span>{" "}
                      {s.info.desc}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </section>
        )}

        {plan?.weeks.map((week) => (
          <section key={week.id} className="mt-8">
            <h2 className="font-display font-bold text-xl mb-4 flex items-center gap-1.5 tracking-tight">
              Week {week.number}
              {week.style ? (
                (() => {
                  const info = termInfo(week.style);
                  const label = (
                    <span className="text-accent">: {week.style}</span>
                  );
                  return info ? (
                    <InfoTip
                      title={info.title}
                      desc={info.desc}
                      className="text-accent"
                    >
                      {label}
                    </InfoTip>
                  ) : (
                    label
                  );
                })()
              ) : null}
            </h2>
            <div className="space-y-3">
              {week.days.map((day, i) => {
                const status = statusByDay.get(day.id) ?? "not_started";
                const isToday = nextDay?.dayId === day.id;
                const done = status === "completed";
                return (
                  <div
                    key={day.id}
                    className={`card p-5 animate-fade-up ${
                      isToday ? "ring-2 ring-accent/60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <ExImage
                            srcKey={focusKey(day.focus)}
                            alt={day.focus}
                            className="w-12 h-12 rounded-xl object-cover border border-border"
                          />
                          {done && (
                            <span className="absolute -top-1.5 -right-1.5 grid place-items-center w-5 h-5 rounded-full bg-accent-2 text-[#05231a] text-[11px] font-bold border-2 border-background">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-muted flex items-center gap-2">
                            Day {(week.number - 1) * 7 + i + 1}
                            {isToday && (
                              <span className="text-accent font-bold">· TODAY</span>
                            )}
                            {done && (
                              <span className="text-accent-2 font-bold">
                                · DONE
                              </span>
                            )}
                          </div>
                          <div className="font-semibold truncate">{day.focus}</div>
                        </div>
                      </div>
                      <Link
                        href={`/workout/${day.id}`}
                        className={`!py-2 !px-3.5 shrink-0 ${
                          isToday ? "btn-primary" : "btn-ghost"
                        }`}
                      >
                        {done ? "View" : isToday ? "Start →" : "Log →"}
                      </Link>
                    </div>

                    <ul className="mt-4 space-y-1.5">
                      {day.exercises.map((ex) => {
                        const st = muscleStyle(ex.muscle);
                        return (
                          <li
                            key={ex.id}
                            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-surface-2 transition-colors text-sm"
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-1.5 h-6 rounded-full shrink-0"
                                style={{ background: st.color }}
                              />
                              <span className="truncate">
                                {ex.groupLabel && (
                                  <span className="text-accent-2 text-xs mr-1.5">
                                    [{ex.groupLabel}]
                                  </span>
                                )}
                                {ex.name}
                              </span>
                            </span>
                            <span className="text-muted text-right shrink-0 text-xs">
                              {ex.isCardio
                                ? ex.repTarget
                                : `${ex.workingSets} × ${ex.repTarget}`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Training terms glossary */}
        <section className="mt-10">
          <details className="card p-5 group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="section-title">Training terms</span>
              <span className="text-muted text-sm group-open:rotate-180 transition-transform">
                ▾
              </span>
            </summary>
            <dl className="mt-4 space-y-3">
              {Object.values(GLOSSARY).map((g) => (
                <div
                  key={g.title}
                  className="rounded-xl bg-surface-2 border border-border px-4 py-3"
                >
                  <dt className="font-semibold text-sm">{g.title}</dt>
                  <dd className="text-sm text-muted mt-0.5 leading-relaxed">
                    {g.desc}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        {/* Reset program */}
        {plan && (
          <section className="card p-6 mt-6 flex items-center justify-between gap-4 border-danger/25">
            <div>
              <h2 className="font-bold">Reset this program</h2>
              <p className="text-xs text-muted mt-0.5 max-w-sm">
                Start over from day one. Clears your logged workouts; body
                metrics, nutrition and photos are kept.
              </p>
            </div>
            <DangerButton
              label="Reset program"
              title="Reset entire program?"
              message="This permanently deletes every workout you've logged in this program and restarts it from day one. Body metrics, nutrition and photos are kept. This can't be undone."
              confirmLabel="Reset program"
              onConfirm={resetProgramAction}
            />
          </section>
        )}
      </main>
    </>
  );
}
