import {
  Award,
  Crosshair,
  Dumbbell,
  Flame,
  Hash,
  Lock,
  Medal,
  Sparkles,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { muscleStyle, focusKey } from "@/lib/ui";


export function MuscleGlyph({
  muscle,
  size = 16,
  tint = true,
  className = "",
}: {
  muscle: string;
  size?: number;
  tint?: boolean;
  className?: string;
}) {
  const st = muscleStyle(muscle);
  // A simple colour dot reads instantly and unambiguously — the abstract
  // per-muscle shapes were easy to misread. Colour still keys the muscle.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`inline-block shrink-0 ${className}`}
      style={tint ? { color: st.color } : undefined}
      aria-hidden
    >
      <circle cx="12" cy="12" r="5" fill="currentColor" />
    </svg>
  );
}

// Day-focus → muscle category glyph (legs/chest/etc.), reusing the glyph set.
const FOCUS_TO_MUSCLE: Record<string, string> = {
  legs: "Legs",
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  calves: "Calves",
  abs: "Abs",
  cardio: "Cardio",
  rest: "Cardio",
  hero: "Other",
};

export function FocusGlyph({
  focus,
  size = 18,
  tint = true,
  className = "",
}: {
  focus: string;
  size?: number;
  tint?: boolean;
  className?: string;
}) {
  const muscle = FOCUS_TO_MUSCLE[focusKey(focus)] ?? "Other";
  return (
    <MuscleGlyph muscle={muscle} size={size} tint={tint} className={className} />
  );
}

// Achievement medals — Lucide glyph in a gradient medallion (or locked state).
const ACHIEVEMENT_ICON: Record<string, LucideIcon> = {
  first: Target,
  sets25: Dumbbell,
  sets100: Hash,
  pr: Trophy,
  streak3: Flame,
  streak7: Zap,
  perfect: Sparkles,
  repmaster: Crosshair,
  week1: Award,
};

export function AchievementBadge({
  id,
  unlocked,
  size = 56,
}: {
  id: string;
  unlocked: boolean;
  size?: number;
}) {
  const Icon = ACHIEVEMENT_ICON[id] ?? Medal;
  const inner = Math.round(size * 0.45);
  if (!unlocked) {
    return (
      <div
        className="grid place-items-center rounded-full border border-border bg-surface-2 text-muted/60"
        style={{ width: size, height: size }}
      >
        <Lock size={inner} strokeWidth={2} />
      </div>
    );
  }
  return (
    <div
      className="grid place-items-center rounded-full text-white shadow-md"
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(135deg, var(--accent-hi), var(--accent))",
        boxShadow: "0 6px 16px -8px rgba(0,0,0,0.5)",
      }}
    >
      <Icon size={inner} strokeWidth={2.2} />
    </div>
  );
}
