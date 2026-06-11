"use client";

import { useState } from "react";
import { resetExerciseCacheAction } from "@/lib/actions";
import { toast } from "@/lib/toast";

export default function ResetDemoCacheButton() {
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    setBusy(true);
    const res = await resetExerciseCacheAction();
    setBusy(false);
    if (res.ok) {
      toast(
        res.count
          ? `Cleared ${res.count} cached demo${res.count === 1 ? "" : "s"} — they'll re-fetch.`
          : "Demo cache is already empty."
      );
    } else {
      toast(res.error ?? "Could not reset cache.");
    }
  };

  return (
    <button
      type="button"
      onClick={reset}
      disabled={busy}
      className="btn-ghost disabled:opacity-60"
    >
      {busy ? "Clearing…" : "Reset demo cache"}
    </button>
  );
}
