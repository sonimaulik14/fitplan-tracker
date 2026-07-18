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
  return (
    <div>
      <span className="label !mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            role="radio"
            aria-checked={o === value}
            onClick={() => onChange(o)}
            className={`chip transition-colors ${
              o === value
                ? "!bg-accent !border-accent text-accent-ink font-bold"
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
}: {
  signals: GeneratorSignals;
}) {
  const suggested = useMemo(() => {
    const set = new Set(signals.underTrained);
    if (signals.weakestLift) set.add(signals.weakestLift.muscle);
    return [...set].slice(0, 2);
  }, [signals]);

  const [days, setDays] = useState<GeneratorAnswers["daysPerWeek"]>(4);
  const [weeks, setWeeks] = useState<number>(8);
  const [goal, setGoal] = useState<GeneratorAnswers["goal"]>("muscle");
  const [priority, setPriority] = useState<string[]>(suggested);
  const [draft, setDraft] = useState<ReturnType<typeof generateProgram> | null>(null);

  const togglePriority = (m: string) =>
    setPriority((p) =>
      p.includes(m) ? p.filter((x) => x !== m) : p.length < 2 ? [...p, m] : p
    );

  const generate = () =>
    setDraft(
      generateProgram(
        { daysPerWeek: days, weeks, goal, priorityMuscles: priority },
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
                    ? "text-success border-success/40 bg-success/10 font-bold"
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
