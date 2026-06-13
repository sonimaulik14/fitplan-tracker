import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Plateau } from "@/lib/metrics";
import { weightNum, slugify, type Unit } from "@/lib/ui";
import { MuscleGlyph } from "./icons";

// Round a display-unit load to the nearest jump available on a bar:
// 2.5 for kg, 5 for lb.
function roundLoad(value: number, unit: Unit) {
  const step = unit === "lb" ? 5 : 2.5;
  return Math.round(value / step) * step;
}

// Heuristic rep-range nudge from the prescribed target — break the stall by
// changing the stimulus in the opposite direction of what they've been doing.
function repAdvice(repTarget: string): string {
  const nums = repTarget.match(/\d+/g)?.map(Number) ?? [];
  const hi = nums.length ? Math.max(...nums) : null;
  if (hi == null) return "change the rep range for a fresh stimulus";
  if (hi >= 12) return "drop to 5–8 reps with heavier load";
  if (hi <= 8) return "try a 12–15 rep block to build work capacity";
  return "alternate a heavy 4–6 rep week, then come back";
}

export default function PlateauCoach({
  plateaus,
  unit,
}: {
  plateaus: Plateau[];
  unit: Unit;
}) {
  if (plateaus.length === 0) return null;
  const shown = plateaus.slice(0, 4);

  return (
    <section className="card p-6 mt-4 animate-fade-up">
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-warn/15 text-warn shrink-0">
          <Sparkles size={18} strokeWidth={2} aria-hidden />
        </span>
        <div>
          <h2 className="font-bold leading-tight">Coach</h2>
          <p className="text-xs text-muted">
            {plateaus.length} lift{plateaus.length === 1 ? "" : "s"} stalled —
            here&apos;s how to break through.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {shown.map((pl) => {
          const deload = roundLoad(weightNum(pl.recentTopKg, unit) * 0.9, unit);
          return (
            <div
              key={pl.name}
              className="rounded-xl border border-border bg-surface-2 p-4"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-2 font-semibold text-sm min-w-0">
                  <MuscleGlyph muscle={pl.muscle} size={15} />
                  <span className="truncate">{pl.name}</span>
                </span>
                <span className="chip text-warn border-warn/30 bg-warn/10 shrink-0">
                  Stalled {pl.sessionsStalled} sessions
                </span>
              </div>

              <p className="text-xs text-muted mt-1.5">
                Est. 1RM has held around{" "}
                <span className="text-foreground font-semibold">
                  {weightNum(pl.bestKg, unit)} {unit}
                </span>{" "}
                — time to change the stimulus.
              </p>

              <div className="grid sm:grid-cols-3 gap-2 mt-3">
                <Tip
                  icon="📉"
                  label="Deload"
                  text={`Drop to ~${deload} ${unit} next session, then rebuild`}
                />
                <Tip icon="🔁" label="Rep range" text={`Or ${repAdvice(pl.repTarget)}`} />
                <Tip
                  icon="↔️"
                  label="Swap"
                  text="Sub a fresh variation in on your next workout"
                />
              </div>

              <Link
                href={`/exercise/${slugify(pl.name)}`}
                className="inline-flex items-center gap-1.5 text-sm text-accent font-semibold mt-3 hover:underline"
              >
                View progression →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Tip({
  icon,
  label,
  text,
}: {
  icon: string;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-lg bg-surface p-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <span>{icon}</span>
        {label}
      </div>
      <p className="text-[11px] text-muted mt-1 leading-snug">{text}</p>
    </div>
  );
}
