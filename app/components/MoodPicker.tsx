"use client";

import { Zap, Smile, Minus, BatteryLow, Bandage } from "lucide-react";

// Segmented session-mood control. The VALUES are the legacy emoji-labeled
// strings ("💪 Strong" …) because they're persisted in WorkoutSession.mood —
// this component maps them to designed glyphs without a data migration.

const MOODS: { value: string; label: string; Icon: typeof Zap }[] = [
  { value: "💪 Strong", label: "Strong", Icon: Zap },
  { value: "🙂 Good", label: "Good", Icon: Smile },
  { value: "😐 Okay", label: "Okay", Icon: Minus },
  { value: "😴 Tired", label: "Tired", Icon: BatteryLow },
  { value: "🤕 Sore", label: "Sore", Icon: Bandage },
];

export default function MoodPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Session mood"
      className="grid grid-cols-5 gap-1 rounded-lg border border-border bg-surface-2 p-1"
    >
      {MOODS.map(({ value: v, label, Icon }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            // Tapping the active mood clears it (mood is optional).
            onClick={() => onChange(active ? "" : v)}
            className={`flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-semibold transition-colors ${
              active
                ? "bg-accent text-accent-ink"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Icon size={16} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
