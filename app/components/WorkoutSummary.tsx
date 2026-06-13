"use client";

import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Dumbbell,
  Package,
  TrendingUp,
  Trophy,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import type { Unit } from "@/lib/ui";
import Sheet from "./Sheet";

export type WorkoutSummaryData = {
  week: number | null;
  sets: number;
  volume: number;
  exercises: number;
  beat: number;
  programComplete: boolean;
};

export default function WorkoutSummary({
  summary,
  unit,
  onClose,
}: {
  summary: WorkoutSummaryData;
  unit: Unit;
  onClose: () => void;
}) {
  const router = useRouter();
  const programDone = summary.programComplete;
  const weekDone = summary.week != null;
  const stats = [
    { label: "Sets logged", value: String(summary.sets), Icon: CheckCircle2 },
    { label: "Exercises", value: String(summary.exercises), Icon: Dumbbell },
    {
      label: "Total volume",
      value: `${summary.volume.toLocaleString()} ${unit}`,
      Icon: Package,
    },
    {
      label: "Beat last time",
      value: `${summary.beat} lift${summary.beat === 1 ? "" : "s"}`,
      Icon: TrendingUp,
    },
  ];
  const HeaderIcon = programDone ? GraduationCap : weekDone ? Trophy : Sparkles;
  return (
    <Sheet
      open
      onClose={onClose}
      ariaLabel="Workout summary"
      panelClassName="w-full max-w-md card overflow-hidden shadow-2xl rounded-t-3xl sm:rounded-2xl"
    >
      <div
        className="text-white px-6 py-8 text-center relative overflow-hidden"
        style={{ background: "var(--accent)" }}
      >
        <HeaderIcon className="w-11 h-11 mx-auto" strokeWidth={1.75} aria-hidden />
        <h2 className="display-hero text-3xl mt-2 text-white">
          {programDone
            ? "12 weeks complete!"
            : weekDone
              ? `Week ${summary.week} complete!`
              : "Workout complete"}
        </h2>
        <p className="text-white/85 text-sm mt-1">
          {programDone
            ? "You finished the entire transformation. Claim your certificate."
            : weekDone
              ? "A full training week in the books. Outstanding."
              : summary.beat > 0
                ? "New ground today — you outlifted last time."
                : "Another session done. Consistency is everything."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 p-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface-2 p-4"
          >
            <s.Icon className="w-4 h-4 text-muted" aria-hidden />
            <div
              className={`font-display font-bold text-xl mt-1 ${
                s.label === "Total volume" ? "num-brand" : ""
              }`}
            >
              {s.value}
            </div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => {
            onClose();
            router.push(programDone ? "/achievements" : "/dashboard");
          }}
        >
          {programDone ? (
            <>
              <GraduationCap size={16} aria-hidden /> Get my certificate
            </>
          ) : (
            "Back to dashboard"
          )}
        </button>
        <button
          type="button"
          className="px-4 rounded-xl border border-border text-sm font-semibold hover:bg-surface-2"
          onClick={onClose}
        >
          Stay
        </button>
      </div>
    </Sheet>
  );
}
