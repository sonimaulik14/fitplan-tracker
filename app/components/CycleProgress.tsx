import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CycleComparison } from "@/lib/metrics";
import { weightNum, slugify, type Unit } from "@/lib/ui";

// "vs last cycle" — the payoff for going again: top strength deltas against
// the previous run of the program. Renders nothing before cycle 2.
export default function CycleProgress({
  cmp,
  unit,
}: {
  cmp: CycleComparison | null;
  unit: Unit;
}) {
  if (!cmp || cmp.lifts.length === 0) return null;
  const top = cmp.lifts.slice(0, 3);
  const fmtDelta = (kg: number) => {
    const v = weightNum(Math.abs(kg), unit);
    return kg > 0.01 ? `+${v}` : kg < -0.01 ? `−${v}` : "±0";
  };
  return (
    <section className="card p-5 sm:p-6 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">
          Cycle {cmp.cycle} vs cycle {cmp.prevCycle}
        </h2>
        {cmp.improvedCount > 0 && (
          <span className="chip text-success border-success/30 bg-success/10">
            {cmp.improvedCount} lift{cmp.improvedCount === 1 ? "" : "s"} up
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {top.map((l) => {
          const up = l.deltaKg > 0.01;
          const down = l.deltaKg < -0.01;
          const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
          const tone = up ? "text-success" : down ? "text-danger" : "text-muted";
          return (
            <Link
              key={l.name}
              href={`/exercise/${slugify(l.name)}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 card-hover"
            >
              <Icon size={16} className={`${tone} shrink-0`} aria-hidden />
              <span className="font-semibold text-sm flex-1 min-w-0 truncate">
                {l.name}
              </span>
              <span className="stat-num text-xs text-muted">
                {weightNum(l.prevBest1RM, unit)} → {weightNum(l.currBest1RM, unit)}
              </span>
              <span className={`stat-num text-sm ${tone}`}>
                {fmtDelta(l.deltaKg)} {unit}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-muted mt-3">
        Est. 1RM per lift, this run vs last.{" "}
        <span className="stat-num">
          {cmp.currWorkouts}/{cmp.prevWorkouts}
        </span>{" "}
        workouts logged so far vs last cycle&apos;s total.
      </p>
    </section>
  );
}
