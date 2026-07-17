"use client";

import { useState, useTransition } from "react";
import { Moon, Bandage, Zap } from "lucide-react";
import { saveReadinessAction } from "@/lib/actions";
import { readinessScore, readinessInfo } from "@/lib/readiness";
import { toast } from "@/lib/toast";

type Answers = {
  sleepQuality: number | null;
  soreness: number | null;
  energy: number | null;
};

// Numeric 1-5 storage; labels/icons derived here (MoodPicker's emoji-string
// persistence is acknowledged legacy debt we deliberately avoid repeating).
const ROWS = [
  { field: "sleepQuality", label: "Sleep", lo: "Rough", hi: "Great", Icon: Moon },
  { field: "soreness", label: "Soreness", lo: "Fresh", hi: "Wrecked", Icon: Bandage },
  { field: "energy", label: "Energy", lo: "Empty", hi: "Charged", Icon: Zap },
] as const;

export default function ReadinessCard({
  initial,
  roughPatch,
}: {
  initial: Answers;
  roughPatch: boolean;
}) {
  const [answers, setAnswers] = useState<Answers>(initial);
  const [, start] = useTransition();

  const tap = (field: (typeof ROWS)[number]["field"], v: number) => {
    const prev = answers[field];
    const next = prev === v ? null : v; // tap the active segment to clear
    setAnswers((a) => ({ ...a, [field]: next })); // optimistic
    start(async () => {
      const res = await saveReadinessAction({ [field]: next });
      if (!res.ok) {
        setAnswers((a) => ({ ...a, [field]: prev })); // roll back
        toast(res.error ?? "Couldn't save.", "error");
      }
    });
  };

  const info = readinessInfo(readinessScore(answers));

  return (
    <section id="checkin" className="card p-5 sm:p-6 animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="section-title">Daily check-in</h2>
        {info ? (
          <span
            className={`chip border ${
              info.tone === "success"
                ? "text-success border-success/30 bg-success/10"
                : "text-warn border-warn/30 bg-warn/10"
            }`}
          >
            {info.label}
            {info.trimPct > 0 && ` — suggestions trimmed ${info.trimPct}%`}
          </span>
        ) : (
          <span className="text-xs text-muted">~10 seconds</span>
        )}
      </div>

      <div className="mt-4 space-y-3.5">
        {ROWS.map(({ field, label, lo, hi, Icon }) => (
          <div key={field}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1.5 font-semibold">
                <Icon size={13} className="text-accent" aria-hidden /> {label}
              </span>
              <span className="text-muted">
                {lo} → {hi}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={label}>
              {[1, 2, 3, 4, 5].map((v) => {
                const active = answers[field] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => tap(field, v)}
                    className={`h-9 rounded-lg border stat-num text-sm transition-colors ${
                      active
                        ? "bg-accent border-accent text-accent-ink font-semibold"
                        : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {roughPatch && (
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs leading-relaxed">
          <span className="font-semibold text-warn">Rough patch.</span> Most of
          your recent check-ins came in low. Consider a light week — trim
          working weights ~10%, keep the movements, and prioritize sleep.
        </p>
      )}
    </section>
  );
}
