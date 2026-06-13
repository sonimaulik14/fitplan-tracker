"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Share2 } from "lucide-react";
import { AnimatedNumber } from "./motion";

export type WrappedStats = {
  volume: number;
  unit: string;
  workouts: number;
  prescribedWorkouts: number;
  sets: number;
  activeDays: number;
  longestStreak: number;
  weeksDone: number;
  totalWeeks: number;
  adherence: number;
  repQuality: number;
  topMuscle: { name: string; volume: number } | null;
  topPR: { name: string; weight: number; reps: number } | null;
  topStyle: { style: string; volume: number } | null;
};

type Slide = {
  bg: string;
  eyebrow?: string;
  big?: React.ReactNode;
  title: string;
  sub?: string;
};

const SLIDE_MS = 5200;

export default function WrappedStory({ stats }: { stats: WrappedStats }) {
  const router = useRouter();

  const slides: Slide[] = [
    {
      bg: "linear-gradient(160deg, #2f6bff 0%, #7c5cff 100%)",
      eyebrow: "Your season",
      title: "12-Week Wrapped",
      sub: "Tap through your transformation →",
    },
    {
      bg: "linear-gradient(160deg, #12c98c 0%, #2f6bff 100%)",
      eyebrow: "Total volume moved",
      big: (
        <>
          <AnimatedNumber value={stats.volume} />
          <span className="text-3xl align-top"> {stats.unit}</span>
        </>
      ),
      title: "That's a lot of iron.",
      sub: "Every rep added up.",
    },
    {
      bg: "linear-gradient(160deg, #ff6a3d 0%, #ff2d55 100%)",
      eyebrow: "Workouts crushed",
      big: <AnimatedNumber value={stats.workouts} />,
      title: `${stats.sets.toLocaleString()} sets logged`,
      sub: `Across ${stats.activeDays} active days.`,
    },
    {
      bg: "linear-gradient(160deg, #ff8a4c 0%, #ff2d55 100%)",
      eyebrow: "Longest streak",
      big: (
        <>
          🔥 <AnimatedNumber value={stats.longestStreak} />
        </>
      ),
      title: "days in a row",
      sub: "Consistency is the whole game.",
    },
    ...(stats.topMuscle
      ? [
          {
            bg: "linear-gradient(160deg, #7c5cff 0%, #ff4d8d 100%)",
            eyebrow: "Most-trained muscle",
            big: stats.topMuscle.name,
            title: "Your signature body part",
            sub: `${Math.round(stats.topMuscle.volume).toLocaleString()} ${stats.unit} of volume.`,
          } as Slide,
        ]
      : []),
    ...(stats.topPR
      ? [
          {
            bg: "linear-gradient(160deg, #18a9ff 0%, #12c98c 100%)",
            eyebrow: "Heaviest lift",
            big: (
              <>
                {Math.round(stats.topPR.weight)}
                <span className="text-3xl align-top"> {stats.unit}</span>
              </>
            ),
            title: stats.topPR.name,
            sub: `Top set: ${Math.round(stats.topPR.weight)} ${stats.unit} × ${stats.topPR.reps}.`,
          } as Slide,
        ]
      : []),
    ...(stats.topStyle
      ? [
          {
            bg: "linear-gradient(160deg, #2f6bff 0%, #18a9ff 100%)",
            eyebrow: "Favourite protocol",
            big: stats.topStyle.style,
            title: "Your go-to block",
            sub: "You put in the most work here.",
          } as Slide,
        ]
      : []),
    {
      bg: "linear-gradient(160deg, #12c98c 0%, #18a9ff 100%)",
      eyebrow: "Plan adherence",
      big: (
        <>
          <AnimatedNumber value={stats.adherence} />
          <span className="text-3xl align-top">%</span>
        </>
      ),
      title: `${stats.repQuality}% rep quality`,
      sub: `${stats.weeksDone} of ${stats.totalWeeks} weeks complete.`,
    },
    {
      bg: "linear-gradient(160deg, #ff6a3d 0%, #7c5cff 60%, #2f6bff 100%)",
      eyebrow: "That's a wrap",
      title: "You showed up.",
      sub: "Share it. Then go again. 💪",
    },
  ];

  const [i, setI] = useState(0);
  const last = slides.length - 1;
  const close = useCallback(() => router.push("/progress"), [router]);

  const next = useCallback(() => {
    setI((v) => (v >= last ? v : v + 1));
  }, [last]);
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  // Auto-advance; stop on the final slide.
  useEffect(() => {
    if (i >= last) return;
    const t = setTimeout(() => setI((v) => v + 1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, close]);

  const s = slides[i];
  const isLast = i === last;

  const share = async () => {
    const text = `My 12-Week Wrapped 💪 ${Math.round(
      stats.volume
    ).toLocaleString()} ${stats.unit} moved · ${stats.workouts} workouts · ${stats.longestStreak}-day streak.`;
    try {
      if (navigator.share) await navigator.share({ title: "Vajra Wrapped", text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user dismissed */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] text-white select-none"
      style={{ background: s.bg, transition: "background 0.5s ease" }}
    >
      {/* progress segments */}
      <div className="absolute top-0 inset-x-0 flex gap-1 p-3 z-20">
        {slides.map((_, idx) => (
          <div
            key={idx}
            className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden"
          >
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: idx < i ? "100%" : idx === i ? "100%" : "0%",
                transition:
                  idx === i ? `width ${SLIDE_MS}ms linear` : "none",
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={close}
        aria-label="Close"
        className="absolute top-5 right-4 z-20 grid place-items-center w-9 h-9 rounded-full bg-black/20 backdrop-blur"
      >
        <X size={18} />
      </button>

      {/* tap zones */}
      <button
        aria-label="Previous"
        onClick={prev}
        className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
      />
      <button
        aria-label="Next"
        onClick={next}
        className="absolute right-0 top-0 bottom-0 w-2/3 z-10"
      />

      {/* slide content */}
      <div
        key={i}
        className="relative z-0 h-full flex flex-col items-center justify-center text-center px-8 animate-fade-up"
      >
        {s.eyebrow && (
          <div className="uppercase tracking-[0.25em] text-xs font-semibold text-white/80 mb-5">
            {s.eyebrow}
          </div>
        )}
        {s.big != null && (
          <div className="font-display font-extrabold leading-none text-7xl sm:text-8xl drop-shadow mb-5">
            {s.big}
          </div>
        )}
        <h2 className="font-display font-bold text-3xl sm:text-4xl max-w-md">
          {s.title}
        </h2>
        {s.sub && (
          <p className="text-white/85 mt-3 max-w-sm text-lg">{s.sub}</p>
        )}

        {isLast && (
          <div className="flex flex-col items-center gap-3 mt-8 z-20">
            <button
              onClick={share}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-[#1a1d29] font-semibold px-5 py-2.5 active:scale-95 transition-transform"
            >
              <Share2 size={16} /> Share my Wrapped
            </button>
            <Link
              href="/achievements"
              className="text-white/80 text-sm font-semibold underline-offset-4 hover:underline"
            >
              View achievements & certificate →
            </Link>
          </div>
        )}
      </div>

      <div className="absolute bottom-5 inset-x-0 text-center text-white/60 text-xs z-0">
        Vajra · 12-Week Wrapped
      </div>
    </div>
  );
}
