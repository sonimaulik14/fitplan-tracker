"use client";

import { useState } from "react";
import { CalendarDays, Dumbbell } from "lucide-react";
import { startPlanAction } from "@/lib/actions";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  daysPerWeek: number;
  custom?: boolean;
};

export default function PlanPicker({
  plans,
  currentPlanId,
}: {
  plans: Plan[];
  currentPlanId?: string;
}) {
  const switching = !!currentPlanId;
  const [selected, setSelected] = useState(
    currentPlanId ?? plans[0]?.id ?? ""
  );
  const chosen = plans.find((p) => p.id === selected) ?? plans[0];
  const isCurrent = switching && selected === currentPlanId;

  return (
    <div className="mt-6 animate-fade-up">
      <div className="mb-4">
        <span className="chip">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Choose your
          program
        </span>
        <h2 className="font-display text-2xl font-bold mt-3">
          {switching ? "Switch your program" : "Pick a plan to start"}
        </h2>
        <p className="text-muted text-sm mt-1">
          {switching
            ? "Pick a different program to switch to — your progress is saved, so you can switch back anytime."
            : "Select the program that fits you, then start training."}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {plans.map((p) => {
          const on = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              aria-pressed={on}
              className={`text-left rounded-xl border p-5 transition-all ${
                on
                  ? "border-accent ring-1 ring-accent/40 bg-accent/10"
                  : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="chip text-accent border-accent/30 bg-accent/10">
                    {p.totalWeeks} weeks
                  </span>
                  {p.custom && (
                    <span className="chip text-steel border-steel/30 bg-steel/10">
                      Yours
                    </span>
                  )}
                  {p.id === currentPlanId && (
                    <span className="chip text-success border-success/30 bg-success/10">
                      Current
                    </span>
                  )}
                </span>
                <span
                  className={`grid place-items-center w-5 h-5 rounded-full border-2 shrink-0 ${
                    on ? "border-transparent brand-bg" : "border-border-strong"
                  }`}
                >
                  {on && (
                    <span className="w-2 h-2 rounded-full bg-accent-ink" />
                  )}
                </span>
              </div>
              <h3 className="font-display font-bold text-xl mt-3">{p.name}</h3>
              {p.description && (
                <p className="text-sm text-muted mt-1.5 leading-relaxed line-clamp-3">
                  {p.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={13} aria-hidden /> {p.totalWeeks} weeks
                </span>
                {p.daysPerWeek > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Dumbbell size={13} aria-hidden /> {p.daysPerWeek} days / week
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-5">
        {isCurrent ? (
          <a href="/dashboard" className="btn-ghost !px-6 !py-3 text-base">
            Back to dashboard
          </a>
        ) : (
          <form action={startPlanAction}>
            <input type="hidden" name="planId" value={selected} />
            <button
              className="btn-primary !px-6 !py-3 text-base"
              disabled={!chosen}
            >
              {switching ? `Switch to ${chosen?.name}` : `Start ${chosen?.name}`}{" "}
              →
            </button>
          </form>
        )}
        {switching && !isCurrent && (
          <a href="/dashboard" className="text-sm text-muted hover:text-foreground">
            Cancel
          </a>
        )}
      </div>
    </div>
  );
}
