"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, SkipForward } from "lucide-react";
import {
  skipDayAction,
  unskipDayAction,
  pushScheduleAction,
} from "@/lib/actions";
import { toast } from "@/lib/toast";

type MissedDay = {
  dayId: string;
  focus: string;
  weekNumber: number;
  dateLabel: string; // pre-formatted "Jul 12"
};

export default function CatchUpCard({
  behind,
  missed,
}: {
  behind: number;
  missed: MissedDay[];
}) {
  const router = useRouter();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const skip = (d: MissedDay) => {
    setGone((g) => new Set(g).add(d.dayId)); // optimistic
    start(async () => {
      const res = await skipDayAction(d.dayId);
      if (!res.ok) {
        setGone((g) => {
          const n = new Set(g);
          n.delete(d.dayId);
          return n;
        });
        toast(res.error ?? "Couldn't skip.", "error");
        return;
      }
      router.refresh();
    });
  };

  const undo = (d: MissedDay) => {
    setGone((g) => {
      const n = new Set(g);
      n.delete(d.dayId);
      return n;
    });
    start(async () => {
      const res = await unskipDayAction(d.dayId);
      if (!res.ok) toast(res.error ?? "Couldn't undo.", "error");
      router.refresh();
    });
  };

  const push = () =>
    start(async () => {
      const res = await pushScheduleAction();
      if (res.ok) {
        toast(
          `Schedule shifted ${res.shiftedDays} day${res.shiftedDays === 1 ? "" : "s"} — you're back on track.`
        );
        router.refresh();
      } else toast(res.error ?? "Couldn't shift the schedule.", "error");
    });

  return (
    <section className="card p-6 animate-fade-up border-warn/30">
      <h2 className="section-title">
        {behind} workout{behind === 1 ? "" : "s"} behind
      </h2>
      <p className="text-sm text-muted mt-2 leading-relaxed">
        Life happened — pick how to handle it. Skipping a day removes it from
        your debt without pretending you trained; shifting the schedule keeps
        every workout and moves the calendar to where you actually are.
      </p>

      {missed.length > 0 && (
        <div className="mt-4 space-y-2">
          {missed.map((d) => {
            const skipped = gone.has(d.dayId);
            return (
              <div
                key={d.dayId}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                  skipped
                    ? "border-border bg-surface-2 opacity-60"
                    : "border-border bg-surface-2"
                }`}
              >
                <span className={`min-w-0 flex-1 truncate ${skipped ? "line-through" : ""}`}>
                  <span className="text-muted">W{d.weekNumber} ·</span> {d.focus}
                  <span className="text-muted"> · {d.dateLabel}</span>
                </span>
                {skipped ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => undo(d)}
                    className="btn-quiet !py-1 text-xs shrink-0"
                  >
                    Undo
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => skip(d)}
                    className="btn-quiet !py-1 text-xs shrink-0"
                  >
                    <SkipForward size={12} aria-hidden /> Skip
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={push}
        className="btn-primary mt-5 disabled:opacity-60"
      >
        <CalendarClock size={15} aria-hidden /> Shift my schedule — resume where
        I left off
      </button>
    </section>
  );
}
