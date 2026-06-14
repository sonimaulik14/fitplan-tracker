"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { setStartDateAction } from "@/lib/actions";
import { toast } from "@/lib/toast";

// Inline editor for the plan's real start date. Collapsed to a small "Edit"
// affordance; expands to a native date picker that saves on confirm.
export default function StartDateEditor({ startDate }: { startDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(startDate);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await setStartDateAction(val);
    setBusy(false);
    if (res.ok) {
      toast("Start date updated");
      setOpen(false);
      router.refresh();
    } else toast(res.error ?? "Could not update");
  };

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
      >
        <Pencil size={12} /> Edit start date
      </button>
    );

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={val}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(e) => setVal(e.target.value)}
        className="input !py-1.5 !w-auto text-sm"
        aria-label="Plan start date"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="btn-primary !px-3 !py-1.5 text-xs disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setVal(startDate);
          setOpen(false);
        }}
        className="text-xs text-muted hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}
