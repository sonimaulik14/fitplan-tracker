"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import DangerButton from "./DangerButton";
import { deletePlanAction } from "@/lib/actions/plans";
import { toast } from "@/lib/toast";

// Edit / Delete row for a user-created program on the Programs page.
export default function CustomPlanActions({
  planId,
  planName,
}: {
  planId: string;
  planName: string;
}) {
  const router = useRouter();

  const remove = async () => {
    const res = await deletePlanAction(planId);
    if (!res.ok) {
      toast(res.error ?? "Couldn't delete the program.", "error");
      return;
    }
    toast("Program deleted.");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link
        href={`/plans/${planId}/edit`}
        className="btn-ghost !px-3 !py-1.5 text-xs"
      >
        <Pencil size={13} aria-hidden /> Edit
      </Link>
      <DangerButton
        label="Delete"
        title={`Delete "${planName}"?`}
        message="This deletes the program AND every workout you logged in it — this can't be undone."
        confirmLabel="Delete program"
        onConfirm={remove}
        className="inline-flex items-center justify-center rounded-xl border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 transition-colors"
      />
    </div>
  );
}
