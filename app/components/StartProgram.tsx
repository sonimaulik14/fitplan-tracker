"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, CalendarPlus } from "lucide-react";
import { startProgramAction } from "@/lib/actions";
import { toast } from "@/lib/toast";

// Start-program control for the not-started state. Defaults to "today"; can be
// expanded to schedule a future (or past) start date.
export default function StartProgram({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [date, setDate] = useState("");

  const run = async (dateStr?: string) => {
    setBusy(true);
    try {
      const res = await startProgramAction(dateStr);
      if (res.ok) {
        toast(
          dateStr ? "Start date scheduled 📅" : "Day 1 starts today — let's go 💪"
        );
        router.refresh();
      } else toast(res.error ?? "Could not start");
    } catch {
      toast("Something went wrong — please try again");
    } finally {
      setBusy(false);
    }
  };

  if (scheduling)
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input !py-2 text-sm"
          aria-label="Plan start date"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => run(date)}
            disabled={busy || !date}
            className="btn-primary !px-4 !py-2 text-sm disabled:opacity-60"
          >
            {busy ? "Starting…" : "Start on this date"}
          </button>
          <button
            type="button"
            onClick={() => setScheduling(false)}
            className="text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    );

  return (
    <div className={`flex flex-col items-stretch gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => run()}
        disabled={busy}
        className="btn-primary inline-flex items-center justify-center gap-2 !px-6 !py-3 disabled:opacity-60"
      >
        <Play size={16} className="shrink-0" />
        {busy ? "Starting…" : "Start program"}
      </button>
      <button
        type="button"
        onClick={() => setScheduling(true)}
        disabled={busy}
        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-accent hover:underline disabled:opacity-60"
      >
        <CalendarPlus size={13} /> Pick a start date
      </button>
    </div>
  );
}
