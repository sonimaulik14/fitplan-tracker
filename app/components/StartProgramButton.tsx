"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { startProgramAction } from "@/lib/actions";
import { toast } from "@/lib/toast";

// Begins the plan — stamps Day 1 as today. Used on the dashboard CTA and the
// timeline page's not-started state.
export default function StartProgramButton({
  className = "",
  label = "Start program",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const res = await startProgramAction();
      if (res.ok) {
        toast("Day 1 starts today — let's go 💪");
        router.refresh();
      } else toast(res.error ?? "Could not start");
    } catch {
      toast("Something went wrong — please try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className={`btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60 ${className}`}
    >
      <Play size={16} className="shrink-0" />
      {busy ? "Starting…" : label}
    </button>
  );
}
