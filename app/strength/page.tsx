import Link from "next/link";
import { Scale } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStrengthProfile } from "@/lib/metrics";
import { fmtWeight, muscleStyle, slugify, LEVELS, type Unit } from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import PhotoHero from "@/app/components/PhotoHero";
import { MuscleGlyph } from "@/app/components/icons";

export const metadata = { title: "Strength profile" };

// Gold ("--pr") chip styling — Tailwind can't do border-pr/30 on a raw var.
const goldChip = {
  color: "var(--pr)",
  borderColor: "color-mix(in srgb, var(--pr) 30%, transparent)",
  background: "color-mix(in srgb, var(--pr) 10%, transparent)",
};

export default async function StrengthPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;
  const p = await getStrengthProfile(user.id);

  const ranked = p.lifts.filter((l) => l.standard);
  const levelCounts = LEVELS.map(
    (lv) => ranked.filter((l) => l.standard!.level === lv).length
  );

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <PhotoHero
          queryKey="page:strength"
          eyebrow="Strength standards"
          title="Strength profile"
          subtitle="Where each big lift sits on the Beginner → Elite ladder for your bodyweight."
          className="mb-4"
        />

        {p.latestBwKg ? (
          <p className="text-sm text-muted">
            Based on your bodyweight of{" "}
            <span className="stat-num text-foreground">
              {fmtWeight(p.latestBwKg, unit)}
            </span>{" "}
            ·{" "}
            <Link href="/measurements" className="text-accent font-semibold hover:underline">
              update →
            </Link>
          </p>
        ) : (
          <div className="card p-8 text-center text-muted">
            <Scale className="w-8 h-8 mx-auto mb-3" strokeWidth={1.75} aria-hidden />
            <p>
              Strength standards are bodyweight-relative — log a weigh-in to
              unlock your ranks.
            </p>
            <Link href="/measurements" className="btn-primary mt-5">
              Log bodyweight
            </Link>
          </div>
        )}

        {ranked.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {LEVELS.map((lv, i) =>
              levelCounts[i] === 0 ? null : lv === "Elite" ? (
                <span key={lv} className="chip border" style={goldChip}>
                  {levelCounts[i]} × Elite
                </span>
              ) : (
                <span
                  key={lv}
                  className="chip text-accent border border-accent/30 bg-accent/10"
                >
                  {levelCounts[i]} × {lv}
                </span>
              )
            )}
          </div>
        )}

        <div className="space-y-3 mt-6 stagger">
          {p.lifts.map((l) => {
            const st = muscleStyle(l.muscle);
            const s = l.standard;
            return (
              <section
                key={l.key}
                className={`card p-5 animate-fade-up border-l-2 ${
                  l.e1RMkg ? "" : "opacity-60"
                }`}
                style={{ borderLeftColor: st.color }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-1.5">
                      <MuscleGlyph muscle={l.muscle} size={15} /> {l.label}
                    </div>
                    {l.tested ? (
                      <div className="text-xs text-muted">
                        <span className="text-accent font-semibold">
                          tested 1RM
                        </span>{" "}
                        {fmtWeight(l.e1RMkg!, unit)}
                        {l.date ? ` · ${l.date}` : ""}
                      </div>
                    ) : l.exerciseName ? (
                      <Link
                        href={`/exercise/${slugify(l.exerciseName)}`}
                        className="text-xs text-muted hover:underline"
                      >
                        via {l.exerciseName} · est. 1RM{" "}
                        {fmtWeight(l.e1RMkg!, unit)}
                        {l.date ? ` · ${l.date}` : ""}
                      </Link>
                    ) : (
                      <div className="text-xs text-muted">
                        Log a {l.label.toLowerCase()} to rank this lift.
                      </div>
                    )}
                  </div>
                  {s &&
                    (s.level === "Elite" ? (
                      <span className="chip border shrink-0" style={goldChip}>
                        Elite
                      </span>
                    ) : (
                      <span className="chip text-accent border border-accent/30 bg-accent/10 shrink-0">
                        {s.level}
                      </span>
                    ))}
                </div>

                {/* 5-band ladder: equal segments per rank (ratio thresholds
                    aren't linear); current band part-fills by bandProgress. */}
                <div className="mt-4">
                  <div className="flex gap-1">
                    {LEVELS.map((lv, i) => {
                      const fill = !s
                        ? 0
                        : i < s.levelIndex
                          ? 1
                          : i === s.levelIndex
                            ? s.bandProgress
                            : 0;
                      return (
                        <div
                          key={lv}
                          className="h-2 flex-1 rounded-full bg-surface-2 overflow-hidden"
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${fill * 100}%`,
                              background: i === 4 ? "var(--pr)" : st.color,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-1 mt-1 text-[10px] text-muted stat-num">
                    {["0×", ...l.thresholds.map((t) => `${t}×`)].map((tick, i) => (
                      <span key={i} className="flex-1">
                        {tick}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                  {s?.next ? (
                    <p className="text-xs text-muted">
                      <span className="font-semibold text-foreground">
                        +{fmtWeight(s.next.deltaKg, unit)}
                      </span>{" "}
                      on your est. 1RM to reach {s.next.level} (
                      {fmtWeight(s.next.targetKg, unit)})
                    </p>
                  ) : s ? (
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "var(--pr)" }}
                    >
                      Elite — {s.ratio}× bodyweight. Top of the ladder.
                    </p>
                  ) : (
                    <span />
                  )}
                  <Link
                    href={`/strength/test/${l.key}`}
                    className="text-xs text-accent font-semibold hover:underline shrink-0"
                  >
                    Test 1RM →
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
