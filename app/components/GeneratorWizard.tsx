"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import PlanBuilder from "./PlanBuilder";
import {
  generateProgram,
  GENERATOR_WEEK_OPTIONS,
  TRAINABLE_MUSCLES,
  type GeneratorAnswers,
  type GeneratorSignals,
} from "@/lib/generator";

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render = String,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render?: (v: T) => string;
}) {
  // Joined-bar segmented control — the ThemeToggle idiom: one bordered track,
  // rounded-md buttons, accent fill on the active choice.
  return (
    <div>
      <span className="label !mb-1.5">{label}</span>
      <div
        className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 flex-wrap"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            role="radio"
            aria-checked={o === value}
            onClick={() => onChange(o)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              o === value
                ? "bg-accent text-accent-ink"
                : "text-muted hover:text-foreground"
            }`}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GeneratorWizard({
  signals,
  defaults,
}: {
  signals: GeneratorSignals;
  /** Pre-seeded answers from the user's onboarding (generatorDefaultsFromUser). */
  defaults?: { daysPerWeek: 3 | 4 | 5 | 6; goal: "muscle" | "strength"; cardio: boolean };
}) {
  const suggested = useMemo(() => {
    const set = new Set(signals.underTrained);
    if (signals.weakestLift) set.add(signals.weakestLift.muscle);
    return [...set].slice(0, 2);
  }, [signals]);

  const [days, setDays] = useState<GeneratorAnswers["daysPerWeek"]>(
    defaults?.daysPerWeek ?? 4
  );
  const [weeks, setWeeks] = useState<number>(8);
  const [goal, setGoal] = useState<GeneratorAnswers["goal"]>(
    defaults?.goal ?? "muscle"
  );
  const [cardio, setCardio] = useState(defaults?.cardio ?? false);
  const [priority, setPriority] = useState<string[]>(suggested);
  const [draft, setDraft] = useState<ReturnType<typeof generateProgram> | null>(null);

  const togglePriority = (m: string) =>
    setPriority((p) =>
      p.includes(m) ? p.filter((x) => x !== m) : p.length < 2 ? [...p, m] : p
    );

  const generate = () =>
    setDraft(
      generateProgram(
        { daysPerWeek: days, weeks, goal, priorityMuscles: priority, cardio },
        signals
      )
    );

  if (draft) {
    return (
      <div>
        <div className="card px-4 py-3 mb-6 flex items-center gap-3 flex-wrap text-sm">
          <Sparkles size={15} className="text-accent shrink-0" aria-hidden />
          <span className="flex-1 min-w-0 text-muted">
            {draft.description} Review below — change anything you like, then
            save.
          </span>
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="btn-quiet !py-1 text-xs shrink-0"
          >
            <RotateCcw size={12} aria-hidden /> Change answers
          </button>
        </div>
        <PlanBuilder initial={draft} />
      </div>
    );
  }

  return (
    <div className="card p-6 animate-fade-up space-y-6">
      <Segmented
        label="How many days a week can you train?"
        options={[3, 4, 5, 6] as const}
        value={days}
        onChange={setDays}
        render={(d) => `${d} days`}
      />
      <Segmented
        label="How long should the block be?"
        options={GENERATOR_WEEK_OPTIONS}
        value={weeks}
        onChange={setWeeks}
        render={(w) => `${w} weeks`}
      />
      <Segmented
        label="What's the goal?"
        options={["muscle", "strength"] as const}
        value={goal}
        onChange={setGoal}
        render={(g) => (g === "muscle" ? "Build muscle" : "Get stronger")}
      />
      <Segmented
        label="Cardio finishers?"
        options={["none", "cardio"] as const}
        value={cardio ? "cardio" : "none"}
        onChange={(v) => setCardio(v === "cardio")}
        render={(v) => (v === "cardio" ? "15 min after each workout" : "None")}
      />
      <div>
        <span className="label !mb-1.5">
          Anything to prioritize? <span className="text-muted">(up to 2)</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {TRAINABLE_MUSCLES.map((m) => {
            const on = priority.includes(m);
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => togglePriority(m)}
                className={`chip transition-colors ${
                  on
                    ? "text-accent border-accent/30 bg-accent/10 font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {m}
                {suggested.includes(m) && (
                  <span className="text-[10px] opacity-70">· suggested</span>
                )}
              </button>
            );
          })}
        </div>
        {suggested.length > 0 && (
          <p className="text-xs text-muted mt-2">
            Suggested from your history:{" "}
            {signals.underTrained.length > 0 &&
              `${signals.underTrained.join(" & ")} ran under its productive volume. `}
            {signals.weakestLift &&
              `${signals.weakestLift.label} is your weakest lift.`}
          </p>
        )}
      </div>
      <button type="button" onClick={generate} className="btn-primary">
        <Sparkles size={15} aria-hidden /> Generate my program
      </button>
    </div>
  );
}
