"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Sparkles, RotateCcw } from "lucide-react";
import { startNextCycleAction } from "@/lib/actions";
import { toast } from "@/lib/toast";

// Day-85 surface: shown on the dashboard (and timeline) once every training
// day of the block is complete. Wrapped/Certificate links sit ABOVE the
// restart so the finale is seen before the slate resets.
export default function ProgramCompleteCard({
  cycle,
  allLogged = true,
}: {
  cycle: number;
  allLogged?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const startNext = () =>
    start(async () => {
      const res = await startNextCycleAction();
      if (!res.ok) {
        toast(res.error ?? "Could not start the next cycle.", "error");
        return;
      }
      toast(`Cycle ${res.cycle} ready — schedule your start day.`);
      router.refresh();
    });

  return (
    <div className="card celebrate-scope p-6 animate-fade-up">
      <p className="eyebrow text-accent">Program complete</p>
      <h2 className="display-hero text-3xl mt-2 uppercase">
        {allLogged ? "All 12 weeks. Done." : "The block has run its course."}
      </h2>
      <p className="text-sm text-muted mt-2 max-w-md">
        {allLogged
          ? `Every training day of ${cycle > 1 ? `cycle ${cycle}` : "the block"} is in the books. Relive it, claim the certificate — then load the bar again.`
          : "The scheduled 12 weeks are over. Look back at what you logged — then load the bar again."}
      </p>
      <div className="flex flex-wrap gap-2 mt-5">
        <Link href="/wrapped" className="btn-primary">
          <Sparkles size={15} aria-hidden /> Watch your Wrapped
        </Link>
        <Link href="/achievements" className="btn-ghost">
          <GraduationCap size={15} aria-hidden /> Certificate
        </Link>
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() => (confirm ? startNext() : setConfirm(true))}
        >
          <RotateCcw size={15} aria-hidden />
          {pending
            ? "Starting…"
            : confirm
              ? "Confirm — your logs stay in History"
              : `Start cycle ${cycle + 1}`}
        </button>
        {confirm && !pending && (
          <p className="text-xs text-muted mt-2">
            The dashboard restarts at Week 1 with your swaps carried over.
            Nothing you logged is deleted.
          </p>
        )}
      </div>
    </div>
  );
}
