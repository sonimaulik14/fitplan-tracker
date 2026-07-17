"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Share2, Link2, Link2Off } from "lucide-react";
import DangerButton from "./DangerButton";
import {
  deletePlanAction,
  sharePlanAction,
  unsharePlanAction,
} from "@/lib/actions/plans";
import { toast } from "@/lib/toast";

// Copy a share URL, preferring the native share sheet on mobile.
async function copyShareLink(token: string) {
  const url = `${window.location.origin}/p/${token}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "My training program", url });
      return;
    }
  } catch {
    /* user dismissed the sheet — fall through to clipboard */
  }
  await navigator.clipboard.writeText(url);
  toast("Share link copied.");
}

// Edit / Share / Delete row for a user-created program on the Programs page.
export default function CustomPlanActions({
  planId,
  planName,
  shareToken,
}: {
  planId: string;
  planName: string;
  shareToken: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    const res = await deletePlanAction(planId);
    if (!res.ok) {
      toast(res.error ?? "Couldn't delete the program.", "error");
      return;
    }
    toast("Program deleted.");
    router.refresh();
  };

  const share = async () => {
    setBusy(true);
    try {
      const res = await sharePlanAction(planId);
      if (!res.ok || !res.token) {
        toast(res.error ?? "Couldn't create a share link.", "error");
        return;
      }
      await copyShareLink(res.token);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const unshare = async () => {
    setBusy(true);
    try {
      const res = await unsharePlanAction(planId);
      if (!res.ok) {
        toast(res.error ?? "Couldn't stop sharing.", "error");
        return;
      }
      toast("Sharing stopped — the old link is dead.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      {shareToken ? (
        <>
          <button
            type="button"
            onClick={() => copyShareLink(shareToken)}
            className="btn-ghost !px-3 !py-1.5 text-xs"
            title="Copy the public link to this program"
          >
            <Link2 size={13} aria-hidden /> Copy link
          </button>
          <button
            type="button"
            onClick={unshare}
            disabled={busy}
            className="btn-ghost !px-2.5 !py-1.5 text-xs text-muted"
            title="Stop sharing — the link stops working"
            aria-label={`Stop sharing ${planName}`}
          >
            <Link2Off size={13} aria-hidden />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={share}
          disabled={busy}
          className="btn-ghost !px-3 !py-1.5 text-xs"
          title="Create a public link anyone can view and clone"
        >
          <Share2 size={13} aria-hidden /> Share
        </button>
      )}
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
