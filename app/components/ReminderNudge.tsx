"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Dumbbell, Flame, Moon, Bell } from "lucide-react";

export default function ReminderNudge({
  trainingToday,
  loggedToday,
  streak,
  focus,
  dayId,
  remindersOn,
}: {
  trainingToday: boolean;
  loggedToday: boolean;
  streak: number;
  focus: string | null;
  dayId: string | null;
  remindersOn: boolean;
}) {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    "default"
  );

  useEffect(() => {
    // browser notification permission isn't available during SSR — read post-mount
    if (typeof Notification === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
  }, []);

  // Fire a one-per-day local notification when conditions are met.
  useEffect(() => {
    if (
      !remindersOn ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted" ||
      !trainingToday ||
      loggedToday
    )
      return;
    const key = `notified-${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    try {
      new Notification("Time to train", {
        body: focus ? `${focus} is on the plan today.` : "Today's a training day.",
      });
    } catch {}
  }, [remindersOn, trainingToday, loggedToday, focus]);

  // Decide the banner content.
  let content: React.ReactNode = null;
  if (loggedToday) {
    content = (
      <Banner tone="done">
        <span className="flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-success" aria-hidden />
          You&apos;ve logged today — great work keeping it up.
        </span>
      </Banner>
    );
  } else if (trainingToday && dayId) {
    content = (
      <Banner tone="go">
        <span className="flex items-center gap-2 min-w-0">
          <Dumbbell size={16} className="shrink-0 text-accent" aria-hidden />
          <span className="truncate">
            Today&apos;s a training day —{" "}
            <span className="font-semibold">{focus}</span> is up.
          </span>
        </span>
        <Link href={`/workout/${dayId}`} className="btn-primary !py-1.5 !px-4 shrink-0">
          Start
        </Link>
      </Banner>
    );
  } else if (streak >= 2) {
    content = (
      <Banner tone="streak">
        <span className="flex items-center gap-2">
          <Flame size={16} className="shrink-0 text-warn" aria-hidden />
          Keep your {streak}-day streak alive — get a session in today.
        </span>
      </Banner>
    );
  } else {
    content = (
      <Banner tone="rest">
        <span className="flex items-center gap-2">
          <Moon size={16} className="shrink-0 text-muted" aria-hidden />
          No session scheduled today — recover well.
        </span>
      </Banner>
    );
  }

  return (
    <div className="mt-6 space-y-2.5">
      {content}
      {remindersOn && perm !== "granted" && perm !== "unsupported" && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/12 text-accent shrink-0">
            <Bell size={15} aria-hidden />
          </span>
          <span className="text-sm text-muted flex-1 min-w-0">
            Get a nudge on training days so you never miss one.
          </span>
          <Link
            href="/account"
            className="btn-primary !py-1.5 !px-3.5 text-xs shrink-0"
          >
            Turn on
          </Link>
        </div>
      )}
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "go" | "streak" | "done" | "rest";
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    go: "border-accent/30 bg-accent/5",
    streak: "border-warn/30 bg-warn/5",
    done: "border-success/30 bg-success/5",
    rest: "border-border bg-surface-2",
  };
  return (
    <div
      className={`card flex items-center justify-between gap-3 px-4 py-3 text-sm border ${styles[tone]}`}
    >
      {children}
    </div>
  );
}
