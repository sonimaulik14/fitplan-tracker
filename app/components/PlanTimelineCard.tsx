import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { Timeline } from "@/lib/metrics";

const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Compact "where am I in the plan" banner for the dashboard. Links to the full
// /timeline calendar. Pure display — receives a prebuilt Timeline.
export default function PlanTimelineCard({ t }: { t: Timeline }) {
  const pct = t.totalDays
    ? Math.round((t.currentDayIndex / t.totalDays) * 100)
    : 0;

  const statusLabel = !t.hasStarted
    ? `Starts ${fmt(t.startDate)}`
    : t.hasFinished
      ? "Plan complete 🎉"
      : t.behind > 0
        ? `${t.behind} workout${t.behind === 1 ? "" : "s"} behind`
        : "On track";

  const statusTone = !t.hasStarted
    ? "text-muted"
    : t.hasFinished
      ? "text-accent-2"
      : t.behind > 0
        ? "text-amber-500"
        : "text-accent-2";

  return (
    <Link
      href="/timeline"
      className="group relative block card p-5 mt-6 animate-fade-up hover:border-border-strong transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays size={17} className="text-accent shrink-0" aria-hidden />
          <span className="font-display font-bold text-lg truncate">
            Week {t.currentWeek}
            <span className="text-muted font-medium">
              {" "}
              · Day {t.currentDayIndex} of {t.totalDays}
            </span>
          </span>
        </div>
        <span className={`text-xs font-semibold shrink-0 ${statusTone}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>
          {fmt(t.startDate)} → {fmt(t.endDate)}
        </span>
        <span className="inline-flex items-center gap-0.5 font-medium text-foreground/70 group-hover:text-foreground transition-colors">
          {t.completedWorkouts}/{t.totalWorkouts} workouts · View calendar
          <ChevronRight size={13} className="shrink-0" />
        </span>
      </div>
    </Link>
  );
}
