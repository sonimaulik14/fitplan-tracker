"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Dumbbell,
  Package,
  TrendingUp,
  Trophy,
  GraduationCap,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import type { Unit } from "@/lib/ui";
import { startNextCycleAction } from "@/lib/actions";
import { toast } from "@/lib/toast";
import Sheet from "./Sheet";
import MoodPicker from "./MoodPicker";

export type WorkoutSummaryData = {
  week: number | null;
  sets: number;
  volume: number;
  exercises: number;
  beat: number;
  programComplete: boolean;
};

export type SummaryMeta = { notes: string; mood: string; bodyweight: number | null };

export default function WorkoutSummary({
  summary,
  unit,
  meta,
  onMetaChange,
  onClose,
}: {
  summary: WorkoutSummaryData;
  unit: Unit;
  meta: SummaryMeta;
  onMetaChange: (patch: Partial<SummaryMeta>) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirmCycle, setConfirmCycle] = useState(false);
  const [pending, start] = useTransition();
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

  const startNextCycle = () =>
    start(async () => {
      const res = await startNextCycleAction();
      if (!res.ok) {
        toast(res.error ?? "Could not start the next cycle.", "error");
        return;
      }
      toast(`Cycle ${res.cycle} ready — schedule your start day.`);
      onClose();
      router.push("/dashboard");
    });

  return (
    <Sheet
      open
      onClose={onClose}
      ariaLabel="Workout summary"
      panelClassName="w-full max-w-md card overflow-hidden rounded-t-2xl sm:rounded-xl"
    >
      <div
        className="px-6 py-8 text-center relative overflow-hidden"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
      >
        <HeaderIcon className="w-11 h-11 mx-auto" strokeWidth={1.75} aria-hidden />
        <h2 className="display-hero text-3xl mt-2 uppercase">
          {programDone
            ? "12 weeks complete"
            : weekDone
              ? `Week ${summary.week} complete`
              : "Workout complete"}
        </h2>
        <p className="text-sm mt-1 opacity-80">
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
            className="rounded-lg border border-border bg-surface-2 p-4"
          >
            <s.Icon className="w-4 h-4 text-muted" aria-hidden />
            <div className="stat-num text-xl mt-1">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* How did it go? — autosaves through the logger's normal save path. */}
      <div className="px-5 pb-4 space-y-3">
        <MoodPicker
          value={meta.mood}
          onChange={(mood) => onMetaChange({ mood })}
        />
        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <div>
            <label className="label" htmlFor="sum-bw">
              Bodyweight ({unit})
            </label>
            <input
              id="sum-bw"
              type="number"
              inputMode="decimal"
              placeholder="—"
              className="input stat-num"
              value={meta.bodyweight ?? ""}
              onChange={(e) =>
                onMetaChange({
                  bodyweight: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="sum-notes">
              Notes
            </label>
            <input
              id="sum-notes"
              type="text"
              className="input"
              placeholder="training / nutrition notes…"
              value={meta.notes}
              onChange={(e) => onMetaChange({ notes: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {programDone && (
          <button
            type="button"
            className="btn-ghost w-full"
            disabled={pending}
            onClick={() => (confirmCycle ? startNextCycle() : setConfirmCycle(true))}
          >
            <RotateCcw size={15} aria-hidden />
            {pending
              ? "Starting…"
              : confirmCycle
                ? "Confirm — your logs stay in History"
                : "Start the next 12-week cycle"}
          </button>
        )}
        <div className="flex gap-2">
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
            className="px-4 rounded-lg border border-border text-sm font-semibold hover:bg-surface-2"
            onClick={onClose}
          >
            Stay
          </button>
        </div>
      </div>
    </Sheet>
  );
}
