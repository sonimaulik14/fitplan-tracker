"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  {
    icon: "🏋️",
    title: "Log every set",
    body: "Open a workout and type your weight × reps. Everything auto-saves as you go — no Save button needed.",
  },
  {
    icon: "🎯",
    title: "Your coach, built in",
    body: "Get progressive-overload suggestions, plate math, and tap any term (Superset, drop set…) for a quick explainer.",
  },
  {
    icon: "📊",
    title: "See your proof",
    body: "Track adherence, rep quality, streaks, PRs and volume. Finish a week to unlock the next.",
  },
  {
    icon: "⌘",
    title: "Move fast",
    body: "Press ⌘K (Ctrl+K) anytime to jump to any page, week, or exercise. Pick your theme & accent from your profile menu.",
  },
];

export default function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      // show the tour once, based on a post-mount localStorage read
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem("fitplan-toured")) setOpen(true);
    } catch {}
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem("fitplan-toured", "1");
    } catch {}
  };

  if (!open) return null;
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <button
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
        onClick={close}
      />
      <div className="relative w-full max-w-md card p-7 text-center shadow-2xl animate-scale-in">
        <div className="text-5xl mb-3">{s.icon}</div>
        <h2 className="font-display text-2xl font-bold">{s.title}</h2>
        <p className="text-muted mt-2 leading-relaxed">{s.body}</p>

        <div className="flex items-center justify-center gap-1.5 mt-5">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-5 bg-accent" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={close} className="btn-ghost flex-1">
            Skip
          </button>
          <button
            onClick={() => (last ? close() : setI((n) => n + 1))}
            className="btn-primary flex-1"
          >
            {last ? "Let's go 💪" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
