"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Target, CheckCircle2, TrendingUp, Users } from "lucide-react";
import VajraMark from "./VajraMark";
import { Reveal, AnimatedNumber, AnimatedRing } from "./motion";
import ThemeToggle from "./ThemeToggle";
import ExImage from "./ExImage";
import { MUSCLE_STYLE } from "@/lib/ui";

export default function Landing() {
  return (
    <div className="flex-1">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/60 backdrop-blur-xl">
        <nav className="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="grid place-items-center w-8 h-8 rounded-xl brand-bg shadow-lg shadow-accent/30">
              <VajraMark size={22} />
            </span>
            <span className="font-display font-bold text-lg tracking-tight">
              Vajra
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <Link href="/login" className="btn-ghost !py-2 !px-3 sm:!px-4">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary !py-2 !px-3 sm:!px-4">
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero — full-bleed cinematic */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <ExImage
            srcKey="hero"
            alt=""
            className="w-full h-full object-cover kenburns"
          />
          {/* dark to the left for headline legibility, photo breathes to the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/25" />
          {/* blend the bottom edge into the page below */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>
      <div className="relative w-full max-w-6xl mx-auto px-5 pt-20 sm:pt-24 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="min-w-0">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="chip"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-2" /> 12-week
            transformation tracker
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[2.75rem] sm:text-6xl xl:text-7xl font-bold leading-[1.02] mt-6"
          >
            Your plan.
            <br />
            Tracked to <span className="gradient-text">the rep.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-muted text-lg mt-6 max-w-md leading-relaxed"
          >
            Follow your training program, log every set and rep, and see exactly
            how closely you stuck to the plan — adherence, rep quality, volume,
            and PRs in one beautiful dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="flex flex-wrap gap-3 mt-8"
          >
            <Link href="/signup" className="btn-primary !px-6 !py-3 text-base">
              Start free →
            </Link>
            <Link href="/login" className="btn-ghost !px-6 !py-3 text-base">
              Try the demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="flex items-center gap-6 mt-10 text-sm text-muted"
          >
            <span>✓ Multi-user</span>
            <span>✓ Free to start</span>
            <span>✓ Works on mobile</span>
          </motion.div>
        </div>

        {/* Floating app preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative min-w-0 w-full"
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="card p-6 sm:p-8 max-w-md mx-auto"
          >
            <div className="flex items-center gap-5">
              <AnimatedRing pct={86} size={120} stroke={12}>
                <div>
                  <div className="text-3xl font-display font-bold">
                    <AnimatedNumber value={86} suffix="%" />
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted">
                    Adherence
                  </div>
                </div>
              </AnimatedRing>
              <div className="flex-1 space-y-3">
                {[
                  { label: "Leg Press", v: "180 × 10", c: "var(--accent)" },
                  { label: "Bench Press", v: "90 × 12", c: "var(--accent-2)" },
                  { label: "Barbell Row", v: "100 × 8", c: "var(--accent-3)" },
                ].map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.12 }}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: row.c }}
                      />
                      {row.label}
                    </span>
                    <span className="font-display font-bold text-sm">{row.v}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { k: "Volume", v: 31200 },
                { k: "Sets", v: 129 },
                { k: "PRs", v: 12 },
              ].map((s) => (
                <div key={s.k} className="rounded-xl bg-surface-2 border border-border p-3 text-center">
                  <div className="font-display font-bold">
                    <AnimatedNumber value={s.v} />
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted mt-0.5">
                    {s.k}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <Reveal>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center">
            Not just a logbook.
          </h2>
          <p className="text-muted text-center mt-3 max-w-xl mx-auto">
            Every number you need to know if you&apos;re actually doing the work.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="card card-hover p-6 h-full">
                <span className="grid place-items-center w-11 h-11 rounded-xl bg-accent/12 text-accent">
                  <f.Icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="font-semibold mt-4">{f.title}</h3>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Muscle gallery */}
      <section className="max-w-6xl mx-auto px-5 py-10">
        <Reveal>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {["Legs", "Chest", "Back", "Shoulders", "Arms", "Abs"].map((m) => (
              <div
                key={m}
                className="relative h-28 rounded-xl overflow-hidden img-overlay group"
              >
                <ExImage
                  srcKey={MUSCLE_STYLE[m].key}
                  alt={m}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 duotone"
                />
                <span className="absolute bottom-2 left-3 z-10 text-white text-sm font-semibold drop-shadow">
                  {m}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <Reveal>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center">
            Three steps to consistency
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-4 mt-12">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="card p-6 h-full">
                <div className="text-5xl font-display font-bold gradient-text">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-semibold mt-4">{s.title}</h3>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <Reveal>
          <div className="relative overflow-hidden card p-10 sm:p-16 text-center">
            <h2 className="display-hero text-3xl sm:text-5xl">
              Start your 12 weeks today.
            </h2>
            <p className="text-muted mt-4 max-w-md mx-auto">
              Create a free account and log your first workout in under a minute.
            </p>
            <Link
              href="/signup"
              className="btn-primary !px-7 !py-3 text-base mt-8 inline-flex"
            >
              Get started — it&apos;s free
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 py-8 text-sm text-muted flex items-center justify-between">
          <span>Vajra · 12-Week Transformation Tracker</span>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    Icon: Target,
    title: "Plan adherence",
    body: "See the % of prescribed workouts and sets you actually completed.",
  },
  {
    Icon: CheckCircle2,
    title: "Rep quality",
    body: "Know whether your reps actually landed in the target range — not just that you showed up.",
  },
  {
    Icon: TrendingUp,
    title: "Volume & PRs",
    body: "Track training volume per muscle and your heaviest lifts over time.",
  },
  {
    Icon: Users,
    title: "Built for everyone",
    body: "Multiple people, private accounts — the whole crew on the same plan.",
  },
];

const STEPS = [
  {
    title: "Start your plan",
    body: "Create an account and kick off your 12-week program.",
  },
  {
    title: "Log every set",
    body: "Enter weight × reps as you train, with last-time hints and a rest timer.",
  },
  {
    title: "Track your proof",
    body: "Watch adherence, rep quality, volume and PRs build week over week.",
  },
];
