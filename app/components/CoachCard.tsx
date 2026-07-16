import Link from "next/link";
import { TrendingDown } from "lucide-react";
import type { Plateau } from "@/lib/metrics";
import { weightNum, slugify, type Unit } from "@/lib/ui";
import { MuscleGlyph } from "./icons";

// Proactive plateau coaching on the dashboard: which lifts have stalled and
// the concrete deload to break them loose. Renders nothing without data.
export default function CoachCard({
  plateaus,
  unit,
}: {
  plateaus: Plateau[];
  unit: Unit;
}) {
  if (plateaus.length === 0) return null;
  const top = plateaus.slice(0, 2);
  return (
    <section className="card p-5 sm:p-6 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">Plateau watch</h2>
        <span className="chip text-warn border-warn/30 bg-warn/10">
          {plateaus.length} stalled lift{plateaus.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {top.map((p) => (
          <Link
            key={p.name}
            href={`/exercise/${slugify(p.name)}`}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3.5 card-hover"
          >
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-warn/15 text-warn shrink-0">
              <TrendingDown size={17} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <MuscleGlyph muscle={p.muscle} size={13} /> {p.name}
              </div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                No new est. 1RM in{" "}
                <span className="stat-num text-foreground">
                  {p.sessionsStalled}
                </span>{" "}
                sessions (best{" "}
                <span className="stat-num text-foreground">
                  {weightNum(p.bestKg, unit)} {unit}
                </span>
                ). Deload: try{" "}
                <span className="stat-num text-accent">
                  {weightNum(p.deloadKg, unit)} {unit}
                </span>{" "}
                with clean reps for 2 sessions, then rebuild — or switch the
                rep range for a fresh stimulus.
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
