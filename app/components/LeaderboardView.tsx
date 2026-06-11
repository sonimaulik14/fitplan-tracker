"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { followAction, unfollowAction } from "@/lib/actions";
import { fmtVolume, type Unit } from "@/lib/ui";

type Row = {
  id: string;
  name: string;
  completedWorkouts: number;
  doneSets: number;
  volume: number;
  streak: number;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardView({
  rows,
  myId,
  following,
  unit,
}: {
  rows: Row[];
  myId: string;
  following: string[];
  unit: Unit;
}) {
  const [view, setView] = useState<"friends" | "global">(
    following.length ? "friends" : "global"
  );
  const followSet = new Set(following);

  const friendRows = rows.filter((r) => r.id === myId || followSet.has(r.id));
  const shown = view === "friends" ? friendRows : rows;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-2 border border-border w-fit mb-4">
        {(["friends", "global"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold capitalize transition-colors ${
              view === v
                ? "bg-foreground/10 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "friends" && friendRows.length <= 1 && (
        <div className="card p-5 text-sm text-muted mb-4">
          You&apos;re not following anyone yet. Switch to{" "}
          <button
            className="text-accent font-semibold"
            onClick={() => setView("global")}
          >
            Global
          </button>{" "}
          and follow some people to build your circle.
        </div>
      )}

      <div className="card divide-y divide-border overflow-hidden">
        {shown.map((r, i) => (
          <Row
            key={r.id}
            row={r}
            rank={i}
            isMe={r.id === myId}
            isFollowing={followSet.has(r.id)}
            unit={unit}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  row,
  rank,
  isMe,
  isFollowing,
  unit,
}: {
  row: Row;
  rank: number;
  isMe: boolean;
  isFollowing: boolean;
  unit: Unit;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const toggle = () =>
    start(async () => {
      if (isFollowing) await unfollowAction(row.id);
      else await followAction(row.id);
      router.refresh();
    });

  return (
    <div className={`flex items-center gap-3 px-4 sm:px-5 py-4 ${isMe ? "bg-accent/5" : ""}`}>
      <div className="w-7 text-center text-lg font-display font-bold shrink-0">
        {MEDALS[rank] ?? <span className="text-muted text-sm">{rank + 1}</span>}
      </div>
      <span className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-accent-3 to-accent text-white font-bold shrink-0">
        {row.name.charAt(0).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">
          {row.name}{" "}
          {isMe && <span className="text-xs text-accent font-normal">(you)</span>}
        </div>
        <div className="text-xs text-muted">
          {row.completedWorkouts} workouts · {row.doneSets} sets ·{" "}
          {fmtVolume(row.volume, unit)} {unit}
          {row.streak > 0 && <> · 🔥 {row.streak}d</>}
        </div>
      </div>
      {!isMe && (
        <button
          onClick={toggle}
          disabled={pending}
          className={`shrink-0 text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors ${
            isFollowing
              ? "border-border text-muted hover:text-foreground"
              : "border-accent text-accent hover:bg-accent hover:text-[#ffffff]"
          }`}
        >
          {isFollowing ? "Following" : "+ Follow"}
        </button>
      )}
    </div>
  );
}
