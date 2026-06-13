"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    if (typeof Notification === "undefined") {
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
      new Notification("Time to train 💪", {
        body: focus ? `${focus} is on the plan today.` : "Today's a training day.",
      });
    } catch {}
  }, [remindersOn, trainingToday, loggedToday, focus]);

  // Decide the banner content.
  let content: React.ReactNode = null;
  if (loggedToday) {
    content = (
      <Banner tone="done">
        ✅ You&apos;ve logged today — great work keeping it up.
      </Banner>
    );
  } else if (trainingToday && dayId) {
    content = (
      <Banner tone="go">
        <span>
          💪 Today&apos;s a training day —{" "}
          <span className="font-semibold">{focus}</span> is up.
        </span>
        <Link href={`/workout/${dayId}`} className="btn-primary !py-1.5 !px-4 shrink-0">
          Start
        </Link>
      </Banner>
    );
  } else if (streak >= 2) {
    content = (
      <Banner tone="streak">
        🔥 Keep your {streak}-day streak alive — get a session in today.
      </Banner>
    );
  } else {
    content = (
      <Banner tone="rest">🧘 No session scheduled today — recover well.</Banner>
    );
  }

  return (
    <div className="mt-6 space-y-2">
      {content}
      {remindersOn && perm !== "granted" && perm !== "unsupported" && (
        <Link
          href="/account"
          className="inline-block text-xs text-accent font-semibold hover:underline"
        >
          🔔 Turn on reminders for this device →
        </Link>
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
    streak: "border-amber-400/30 bg-amber-400/5",
    done: "border-accent-2/30 bg-accent-2/5",
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
