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

// Custom, consistent muscle-group glyph set — abstract marks (not emoji), tinted
// by each muscle's color. Distinct by shape + color, premium and on-brand.
const GLYPHS: Record<string, React.ReactNode> = {
  legs: <rect x="9" y="3.5" width="6" height="17" rx="3" />,
  chest: (
    <>
      <circle cx="8.5" cy="11" r="4.2" />
      <circle cx="15.5" cy="11" r="4.2" />
    </>
  ),
  back: (
    <>
      <path d="M4 7.5l8 5.5 8-5.5" />
      <path d="M4 13l8 5.5 8-5.5" />
    </>
  ),
  shoulders: <path d="M3.5 16a8.5 8.5 0 0 1 17 0" />,
  arms: <path d="M6 19v-9a3.2 3.2 0 0 1 6.4 0c0 4.4 2.8 6 5.6 6" />,
  calves: (
    <>
      <path d="M12 3.2c4.2 3.8 4.2 9 0 12.5-4.2-3.5-4.2-8.7 0-12.5z" />
      <path d="M12 16v4.5" />
    </>
  ),
  abs: (
    <>
      <rect x="5" y="5" width="5.5" height="4" rx="1.2" />
      <rect x="13.5" y="5" width="5.5" height="4" rx="1.2" />
      <rect x="5" y="10.5" width="5.5" height="4" rx="1.2" />
      <rect x="13.5" y="10.5" width="5.5" height="4" rx="1.2" />
      <rect x="5" y="16" width="5.5" height="3.5" rx="1.2" />
      <rect x="13.5" y="16" width="5.5" height="3.5" rx="1.2" />
    </>
  ),
  cardio: <path d="M12 20.5S4 16 4 10.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 8 2.5c0 5.5-8 10-8 10z" />,
  hero: (
    <>
      <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
    </>
  ),
};

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
  const glyph = GLYPHS[st.key] ?? GLYPHS.hero;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
      style={tint ? { color: st.color } : undefined}
      aria-hidden
    >
      {glyph}
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
