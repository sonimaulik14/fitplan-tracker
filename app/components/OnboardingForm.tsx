"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboardingAction } from "@/lib/actions";
import type { Unit } from "@/lib/ui";

const GOALS = [
  { id: "muscle", label: "Build muscle", icon: "💪" },
  { id: "fatloss", label: "Lose fat", icon: "🔥" },
  { id: "strength", label: "Get stronger", icon: "🏋️" },
  { id: "consistency", label: "Stay consistent", icon: "📈" },
];
// Monday-first; value is the weekday number stored in trainingDays (0=Sun..6=Sat).
const DAY_ORDER = [
  { v: 1, label: "Mon" },
  { v: 2, label: "Tue" },
  { v: 3, label: "Wed" },
  { v: 4, label: "Thu" },
  { v: 5, label: "Fri" },
  { v: 6, label: "Sat" },
  { v: 0, label: "Sun" },
];

export default function OnboardingForm({
  edit,
  initial,
}: {
  edit: boolean;
  initial: {
    goal: string;
    unit: Unit;
    trainingDays: number[];
    reminderTime: string;
    remindersOn: boolean;
  };
}) {
  const [goal, setGoal] = useState(initial.goal || "muscle");
  const [unit, setUnit] = useState<Unit>(initial.unit);
  const [days, setDays] = useState<number[]>(
    initial.trainingDays.length ? initial.trainingDays : [1, 2, 4, 5]
  );
  const [reminderTime, setReminderTime] = useState(initial.reminderTime);
  const [remindersOn, setRemindersOn] = useState(initial.remindersOn);
  const [bodyweight, setBodyweight] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const submit = () => {
    start(async () => {
      if (remindersOn && typeof Notification !== "undefined") {
        try {
          await Notification.requestPermission();
        } catch {}
      }
      const res = await completeOnboardingAction({
        goal,
        unit,
        trainingDays: days,
        reminderTime,
        remindersOn,
        bodyweight: bodyweight ? Number(bodyweight) : null,
      });
      if (res.ok) router.push("/dashboard");
    });
  };

  // Leave without saving. Only offered in edit mode — first-time setup is
  // required (the dashboard redirects un-onboarded users back here).
  const close = () => {
    if (typeof window !== "undefined" && window.history.length > 1)
      router.back();
    else router.push("/dashboard");
  };

  return (
    <div className="relative w-full max-w-lg card p-7 sm:p-8 animate-fade-up">
      {edit && (
        <button
          type="button"
          onClick={close}
          aria-label="Close without saving"
          className="absolute top-4 right-4 grid place-items-center w-9 h-9 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
      <div className="flex items-center gap-2 mb-1">
        <span className="grid place-items-center w-9 h-9 rounded-xl brand-bg text-[#ffffff] font-black text-lg shadow-lg shadow-accent/30">
          F
        </span>
        <span className="font-display font-bold text-xl">
          Fit<span className="gradient-text">Plan</span>
        </span>
      </div>
      <h1 className="text-2xl font-bold mt-4">
        {edit ? "Your setup" : "Let's set you up"}
      </h1>
      <p className="text-muted text-sm mt-1">
        Takes 20 seconds. You can change these anytime.
      </p>

      {/* Goal */}
      <div className="mt-6">
        <div className="label">What&apos;s your main goal?</div>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGoal(g.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                goal === g.id
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              <span>{g.icon}</span> {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Units */}
      <div className="mt-5">
        <div className="label">Weight units</div>
        <div className="flex items-center rounded-xl border border-border bg-surface-2 p-1 w-fit">
          {(["kg", "lb"] as Unit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                unit === u
                  ? "bg-accent text-[#ffffff]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Training days */}
      <div className="mt-5">
        <div className="label">Which days do you train?</div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {DAY_ORDER.map(({ v, label }) => {
            const active = days.includes(v);
            return (
              <button
                key={v}
                type="button"
                aria-pressed={active}
                aria-label={label}
                onClick={() => toggleDay(v)}
                className={`flex items-center justify-center h-12 rounded-xl text-xs font-bold border transition-colors ${
                  active
                    ? "bg-accent text-white border-accent shadow-sm shadow-accent/30"
                    : "bg-surface-2 text-muted border-border active:bg-surface hover:text-foreground hover:border-border-strong"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-2">
          {days.length === 0
            ? "Pick the days you plan to train."
            : `Training on ${DAY_ORDER.filter((d) => days.includes(d.v))
                .map((d) => d.label)
                .join(", ")}.`}
        </p>
      </div>

      {/* Reminders */}
      <div className="mt-5 rounded-xl border border-border bg-surface-2 p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span>
            <span className="font-semibold text-sm">Workout reminders</span>
            <span className="block text-xs text-muted mt-0.5">
              A nudge on training days so you never miss one.
            </span>
          </span>
          <input
            type="checkbox"
            checked={remindersOn}
            onChange={(e) => setRemindersOn(e.target.checked)}
            className="w-5 h-5 accent-[var(--accent)]"
          />
        </label>
        {remindersOn && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted">Remind me at</span>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="input py-1.5 w-32"
            />
          </div>
        )}
      </div>

      {/* Starting weight */}
      <div className="mt-5">
        <div className="label">Starting bodyweight ({unit}) — optional</div>
        <input
          type="number"
          inputMode="decimal"
          placeholder={`e.g. ${unit === "lb" ? "180" : "82"}`}
          className="input"
          value={bodyweight}
          onChange={(e) => setBodyweight(e.target.value)}
        />
      </div>

      <button
        className="btn-primary w-full !py-3 mt-7"
        onClick={submit}
        disabled={pending}
      >
        {pending
          ? "Saving…"
          : edit
            ? "Save settings"
            : "Start training →"}
      </button>
    </div>
  );
}
