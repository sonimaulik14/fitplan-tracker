// Shared, client-safe presentation helpers (no server imports).
// Images are local files under /public/kris/<key>.(jpg|svg) — see that folder's
// README. ExImage resolves the real photo and falls back to the placeholder.

import { parseRepRange } from "./reps";

// parseRepRange moved to lib/reps.ts; re-exported so existing importers keep
// working unchanged.
export { parseRepRange };

export type MuscleStyle = { icon: string; color: string; key: string };

export const MUSCLE_STYLE: Record<string, MuscleStyle> = {
  Legs: { icon: "🦵", color: "#ff6a3d", key: "legs" },
  Chest: { icon: "🫁", color: "#ff5b8a", key: "chest" },
  Back: { icon: "🦴", color: "#7c8cff", key: "back" },
  Shoulders: { icon: "🪨", color: "#f5c451", key: "shoulders" },
  Arms: { icon: "💪", color: "#2fe6a8", key: "arms" },
  Calves: { icon: "🦿", color: "#27c4d6", key: "calves" },
  Abs: { icon: "🔥", color: "#ff8a4c", key: "abs" },
  Cardio: { icon: "❤️", color: "#ff4d6d", key: "cardio" },
  Other: { icon: "🏋️", color: "#99a1b3", key: "hero" },
};

export function muscleStyle(muscle: string): MuscleStyle {
  return MUSCLE_STYLE[muscle] ?? MUSCLE_STYLE.Other;
}

// Evidence-based weekly working-set landmarks per muscle group.
// mev = minimum effective volume, mav = adaptive sweet spot, mrv = max recoverable.
export const VOLUME_LANDMARKS: Record<
  string,
  { mev: number; mav: number; mrv: number }
> = {
  Legs: { mev: 8, mav: 16, mrv: 26 },
  Chest: { mev: 8, mav: 14, mrv: 22 },
  Back: { mev: 10, mav: 16, mrv: 25 },
  Shoulders: { mev: 8, mav: 16, mrv: 22 },
  Arms: { mev: 8, mav: 16, mrv: 24 },
  Calves: { mev: 8, mav: 14, mrv: 20 },
  Abs: { mev: 6, mav: 16, mrv: 25 },
};

export function landmarkVerdict(
  weeklySets: number,
  l: { mev: number; mav: number; mrv: number }
): { label: string; tone: "low" | "good" | "high" } {
  if (weeklySets < l.mev) return { label: "Below MEV", tone: "low" };
  if (weeklySets > l.mrv) return { label: "Over MRV", tone: "high" };
  return { label: "Productive", tone: "good" };
}

// The CSS var for a verdict's tone — shared by the landmarks bars, the body
// map outlines, and the trend grid.
export function toneColor(tone: "low" | "good" | "high"): string {
  return tone === "good"
    ? "var(--success)"
    : tone === "high"
      ? "var(--danger)"
      : "var(--warn)";
}

// 0..1 fill intensity for a heat cell: sets scaled against MRV (the visual
// ceiling), so "full colour" ≈ at/above max recoverable volume.
export function heatIntensity(sets: number, l: { mrv: number }): number {
  if (!(sets > 0) || l.mrv <= 0) return 0;
  return Math.min(1, sets / l.mrv);
}

// Muscle colour at a given intensity, using the color-mix ramp idiom from
// globals.css. Zero intensity falls back to the neutral surface so empty
// regions/cells stay visible but muted. `minPct` keeps low-but-nonzero heat
// legible instead of near-invisible.
export function muscleTint(muscle: string, intensity: number): string {
  if (!(intensity > 0)) return "var(--surface-2)";
  const pct = Math.round(8 + Math.min(1, intensity) * 82); // ~8% → 90%
  return `color-mix(in srgb, ${muscleStyle(muscle).color} ${pct}%, transparent)`;
}

export const HERO_KEY = "hero";

// An icon that represents a whole training day based on its focus text.
export function focusIcon(focus: string): string {
  const f = focus.toLowerCase();
  if (f.includes("rest")) return "🧘";
  if (f.includes("leg")) return "🦵";
  if (f.includes("chest")) return "🫁";
  if (f.includes("shoulder")) return "🪨";
  if (f.includes("back")) return "🦴";
  if (f.includes("bicep") || f.includes("arm")) return "💪";
  return "🏋️";
}

// The image key (file name) for a training day based on its focus text.
export function focusKey(focus: string): string {
  const f = focus.toLowerCase();
  if (f.includes("rest")) return "rest";
  if (f.includes("leg")) return "legs";
  if (f.includes("chest")) return "chest";
  if (f.includes("shoulder")) return "shoulders";
  if (f.includes("back")) return "back";
  if (f.includes("bicep") || f.includes("arm")) return "arms";
  if (f.includes("calf") || f.includes("calve")) return "calves";
  if (f.includes("ab")) return "abs";
  return "hero";
}

// URL-friendly slug for an exercise name, e.g.
// "Barbell Bench Press — Medium Grip" -> "barbell-bench-press-medium-grip".
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- supplements ----------
// Stored in User.supplements as a JSON array of {name,dose,unit}. Falls back to
// parsing the legacy comma-separated names format (dose/unit unknown).
export type Supplement = { name: string; dose: number | null; unit: string };

export function parseSupplements(raw: string | null | undefined): Supplement[] {
  if (!raw) return [];
  const s = raw.trim();
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr))
        return arr
          .filter((x) => x && typeof x.name === "string" && x.name.trim())
          .slice(0, 20)
          .map((x) => ({
            name: String(x.name).trim().slice(0, 40),
            dose:
              typeof x.dose === "number" && isFinite(x.dose) && x.dose > 0
                ? x.dose
                : null,
            unit: (typeof x.unit === "string" ? x.unit : "").trim().slice(0, 8),
          }));
    } catch {
      /* fall through to legacy parse */
    }
  }
  return s
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((name) => ({ name: name.slice(0, 40), dose: null, unit: "" }));
}

export function serializeSupplements(list: Supplement[]): string | null {
  const clean = list
    .filter((x) => x.name && x.name.trim())
    .slice(0, 20)
    .map((x) => ({
      name: x.name.trim().slice(0, 40),
      dose: x.dose && x.dose > 0 ? x.dose : null,
      unit: (x.unit || "").trim().slice(0, 8),
    }));
  return clean.length ? JSON.stringify(clean) : null;
}

// "Creatine · 5 g" label for a supplement (omits the dose when unknown).
export function supplementLabel(s: { dose: number | null; unit: string }): string {
  return s.dose ? `${s.dose}${s.unit ? " " + s.unit : ""}` : "";
}

// ---------- weight units ----------
export type Unit = "kg" | "lb";
export const LB_PER_KG = 2.2046226218;

export function kgToUnit(kg: number, unit: Unit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg;
}
export function unitToKg(value: number, unit: Unit): number {
  return unit === "lb" ? value / LB_PER_KG : value;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
/** kg (stored) -> number in the user's unit, sensibly rounded. */
export function weightNum(kg: number, unit: Unit): number {
  return round1(kgToUnit(kg, unit));
}
/** kg (stored) -> "100 kg" / "220.5 lb". */
export function fmtWeight(kg: number, unit: Unit): string {
  return `${weightNum(kg, unit)} ${unit}`;
}
/** Volume (kg·reps stored) -> localized number in the user's unit. */
export function fmtVolume(volumeKg: number, unit: Unit): string {
  return Math.round(kgToUnit(volumeKg, unit)).toLocaleString();
}

// Body measurements: stored in cm, shown in cm (metric) or inches (imperial),
// keyed off the same kg/lb preference. Body-fat % is unitless.
export const CM_PER_IN = 2.54;
export function lengthUnit(unit: Unit): "cm" | "in" {
  return unit === "lb" ? "in" : "cm";
}
export function cmToLen(cm: number, unit: Unit): number {
  return round1(unit === "lb" ? cm / CM_PER_IN : cm);
}
export function lenToCm(value: number, unit: Unit): number {
  return unit === "lb" ? value * CM_PER_IN : value;
}

// overloadSuggestion grew into the progression engine — see lib/progression.ts
// (prescribe): RPE- and plateau-aware, same double-progression core.

// Bodyweight-ratio strength standards for the recognised barbell lifts.
// `match` is a positive anchor and `exclude` vetoes variants that share the
// substring but train something else entirely (leg curls are not biceps
// curls; hack squats are not back squats) — loose matching here used to rank
// machine accessories as "Elite" barbell lifts.
export type LiftKey = "squat" | "deadlift" | "bench" | "ohp" | "row" | "curl";
export const LEVELS = [
  "Beginner",
  "Novice",
  "Intermediate",
  "Advanced",
  "Elite",
] as const;
export type StrengthLevel = (typeof LEVELS)[number];

type LiftStandard = {
  key: LiftKey;
  label: string;
  muscle: string; // keys MUSCLE_STYLE for tinting
  match: RegExp;
  exclude?: RegExp;
  t: number[]; // 4 ascending bodyweight ratios -> 5 bands
};

const STANDARDS: LiftStandard[] = [
  {
    key: "squat",
    label: "Back Squat",
    muscle: "Legs",
    match: /squat/,
    exclude:
      /hack|split|smith|dumbbell|goblet|kettlebell|bulgarian|pistol|sissy|jump|front|overhead|zercher/,
    t: [0.75, 1.25, 1.75, 2.25],
  },
  {
    key: "deadlift",
    label: "Deadlift",
    muscle: "Back",
    match: /deadlift/,
    exclude:
      /stiff|straight[- ]leg|romanian|\brdl\b|single[- ]leg|one[- ]leg|dumbbell|kettlebell/,
    t: [1.0, 1.5, 2.0, 2.5],
  },
  {
    key: "bench",
    label: "Bench Press",
    muscle: "Chest",
    match: /bench press/,
    exclude: /incline|decline|close[- ]grip|dumbbell|smith|machine|floor|board|reverse/,
    t: [0.5, 0.75, 1.0, 1.5],
  },
  {
    key: "ohp",
    label: "Overhead Press",
    muscle: "Shoulders",
    match: /(overhead|military|shoulder|strict) press|\bohp\b/,
    exclude:
      /dumbbell|smith|machine|cable|leverage|arnold|kettlebell|single|one[- ]arm|pike|handstand|leg/,
    t: [0.35, 0.55, 0.8, 1.05],
  },
  {
    key: "row",
    label: "Barbell Row",
    muscle: "Back",
    match: /barbell row|bent[- ]over row|pendlay/,
    exclude: /upright|dumbbell|cable|machine|smith|inverted|single|one[- ]arm|t[- ]bar/,
    t: [0.5, 0.75, 1.0, 1.4],
  },
  {
    key: "curl",
    label: "Barbell Curl",
    muscle: "Arms",
    match: /barbell curl|ez[- ]?bar curl/,
    exclude: /leg|wrist|reverse|preacher|lying|cable|machine|spider|drag/,
    t: [0.2, 0.35, 0.5, 0.65],
  },
];

/** Read-only category view (no regexes) so pages can enumerate all lifts. */
export const LIFT_CATEGORIES = STANDARDS.map(({ key, label, muscle, t }) => ({
  key,
  label,
  muscle,
  thresholds: t,
}));

function findStandard(exerciseName: string): LiftStandard | null {
  const n = exerciseName.toLowerCase();
  return STANDARDS.find((s) => s.match.test(n) && !s.exclude?.test(n)) ?? null;
}

/** Which standards category a lift belongs to, or null for accessories. */
export function classifyLift(exerciseName: string): LiftKey | null {
  return findStandard(exerciseName)?.key ?? null;
}

export type StrengthRank = {
  key: LiftKey;
  label: string;
  level: StrengthLevel;
  levelIndex: number; // 0..4
  ratio: number; // e1RM / bodyweight, 2dp
  thresholds: number[];
  bandProgress: number; // 0..1 within the current band; 1 at Elite
  next: {
    level: StrengthLevel;
    thresholdRatio: number;
    targetKg: number;
    deltaKg: number;
  } | null;
};

export function strengthNext(
  oneRMkg: number,
  bodyweightKg: number | null,
  exerciseName: string
): StrengthRank | null {
  if (!bodyweightKg || bodyweightKg <= 0 || oneRMkg <= 0) return null;
  const std = findStandard(exerciseName);
  if (!std) return null;
  const ratio = oneRMkg / bodyweightKg;
  let levelIndex = 0;
  // Epsilon so an exact-threshold ratio (140/80 === 1.75) ranks up despite
  // float noise from real bodyweights.
  for (const thr of std.t) if (ratio >= thr - 1e-9) levelIndex++;
  const lower = levelIndex === 0 ? 0 : std.t[levelIndex - 1];
  const upper = levelIndex < std.t.length ? std.t[levelIndex] : null;
  const bandProgress =
    upper === null ? 1 : Math.min(1, Math.max(0, (ratio - lower) / (upper - lower)));
  const next =
    upper === null
      ? null
      : {
          level: LEVELS[levelIndex + 1],
          thresholdRatio: upper,
          targetKg: upper * bodyweightKg,
          deltaKg: Math.max(0, upper * bodyweightKg - oneRMkg),
        };
  return {
    key: std.key,
    label: std.label,
    level: LEVELS[levelIndex],
    levelIndex,
    ratio: Math.round(ratio * 100) / 100,
    thresholds: std.t,
    bandProgress,
    next,
  };
}

/** Back-compat wrapper — the exercise page's level card keeps working. */
export function strengthStandard(
  oneRMkg: number,
  bodyweightKg: number | null,
  exerciseName: string
): { ratio: number; level: string } | null {
  const r = strengthNext(oneRMkg, bodyweightKg, exerciseName);
  return r ? { ratio: r.ratio, level: r.level } : null;
}

// ---------- training-term glossary ----------
export type GlossaryEntry = { title: string; desc: string };

export const GLOSSARY: Record<string, GlossaryEntry> = {
  superset: {
    title: "Superset",
    desc: "Two exercises done back-to-back with no rest between them, then rest after the pair.",
  },
  "giant set": {
    title: "Giant Set",
    desc: "Three or more exercises performed back-to-back with no rest — a big pump and lots of volume.",
  },
  "alternating sets": {
    title: "Alternating Sets",
    desc: "Alternate between two exercises, resting after each, so one muscle recovers while the other works.",
  },
  "drop set": {
    title: "Drop Set",
    desc: "Hit failure, then immediately lower the weight and keep repping. Each weight reduction is a 'drop'.",
  },
  "double drop": {
    title: "Double Drop Set",
    desc: "A drop set with two weight reductions in a row after the first failure.",
  },
  "triple drop": {
    title: "Triple Drop Set",
    desc: "A drop set with three weight reductions in a row.",
  },
  "to failure": {
    title: "To Failure",
    desc: "Keep going until you physically can't complete another rep with good form.",
  },
  "rest-pause": {
    title: "Rest-Pause",
    desc: "After failure, rest 10–15 seconds, then squeeze out a few more reps with the same weight.",
  },
  "21s": {
    title: "21s",
    desc: "7 bottom-half reps + 7 top-half reps + 7 full reps = 21 total in one set.",
  },
  rpe: {
    title: "RPE",
    desc: "Rate of Perceived Exertion (1–10): how hard the set felt. 10 = no reps left in the tank.",
  },
  "warm-up": {
    title: "Warm-up sets",
    desc: "Light prep sets to ready the muscle and joints. Not counted toward your working sets.",
  },
  y3t: {
    title: "Y3T (Yoda 3 Training)",
    desc: "Neil Hill's method that rotates rep ranges across weeks — heavy/strength, hypertrophy, then high-rep endurance — to keep progressing and avoid plateaus.",
  },
  yt3: {
    title: "YT3",
    desc: "A rotating training block that cycles rep ranges and intensity techniques week to week to keep the muscles adapting.",
  },
  dtp: {
    title: "DTP (Dramatic Transformation Principle)",
    desc: "Ascending-then-descending rep pyramids (e.g. 50→10→50) for huge volume and pump.",
  },
  "dtp extreme": {
    title: "DTP Extreme",
    desc: "An intensified DTP block: long descending-then-ascending rep ladders (e.g. 30→5→30) on the same lift, often paired in supersets, for extreme volume and pump.",
  },
  "fst-7": {
    title: "FST-7 (Fascia Stretch Training)",
    desc: "Hany Rambod's method: finish a muscle with 7 sets of the same exercise, ~30 seconds rest between them, to stretch the fascia and force a massive pump.",
  },
  gvt: {
    title: "GVT (German Volume Training)",
    desc: "10 sets of 10 reps on one main lift with short (~60s) rest — brutal volume at a fixed weight to drive growth. Pick a load you could do for ~20 reps.",
  },
  hit: {
    title: "HIT (High Intensity Training)",
    desc: "Few sets (often just 2) taken to all-out failure with full effort, then ample recovery — minimal volume, maximal intensity per set.",
  },
};

/** Look up a term (group label, week style, etc.) — case-insensitive. */
export function termInfo(term: string): GlossaryEntry | null {
  return GLOSSARY[term.trim().toLowerCase()] ?? null;
}

/** Detect an intensity technique mentioned in a rep-target string. */
export function schemeInfo(repTarget: string): GlossaryEntry | null {
  const t = repTarget.toLowerCase();
  if (t.includes("double drop")) return GLOSSARY["double drop"];
  if (t.includes("triple drop")) return GLOSSARY["triple drop"];
  if (t.includes("drop")) return GLOSSARY["drop set"];
  if (t.includes("rest-pause") || t.includes("rest pause"))
    return GLOSSARY["rest-pause"];
  if (t.includes("21")) return GLOSSARY["21s"];
  if (t.includes("failure")) return GLOSSARY["to failure"];
  return null;
}

export const QUOTES = [
  "The only bad workout is the one you didn't do.",
  "Discipline is choosing what you want most over what you want now.",
  "Success starts with self-discipline.",
  "The pain you feel today is the strength you feel tomorrow.",
  "Don't count the days, make the days count.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Push yourself, because no one else is going to do it for you.",
];

// Deterministic "quote of the day" so it's stable per render/day.
export function quoteForDay(seed: number): string {
  return QUOTES[Math.abs(seed) % QUOTES.length];
}
