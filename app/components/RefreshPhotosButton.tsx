"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetPhotoCacheAction } from "@/lib/actions";
import { toast } from "@/lib/toast";

export default function RefreshPhotosButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    setBusy(true);
    const res = await resetPhotoCacheAction();
    setBusy(false);
    if (res.ok) {
      toast(
        res.count
          ? `Cleared ${res.count} photo${res.count === 1 ? "" : "s"} — fresh ones load next.`
          : "No cached photos to clear."
      );
      router.refresh();
    } else {
      toast(res.error ?? "Could not refresh photos.");
    }
  };

  return (
    <button
      type="button"
      onClick={reset}
      disabled={busy}
      className="btn-ghost disabled:opacity-60"
    >
      {busy ? "Refreshing…" : "Refresh photos"}
    </button>
  );
}
