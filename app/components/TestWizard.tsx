"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { logLiftTestAction } from "@/lib/actions";
import {
  strengthNextByKey,
  unitToKg,
  weightNum,
  type Unit,
  type LiftKey,
} from "@/lib/ui";
import { testRamp, KG_PLATES, LB_PLATES, KG_BARS, LB_BARS } from "@/lib/plates";
import { toast } from "@/lib/toast";

type Attempt = { weight: number; reps: number; success: boolean };

const STEPS = ["Target", "Warm-up", "Attempts", "Result"] as const;

export default function TestWizard({
  lift,
  label,
  bestE1RM, // display unit, null when nothing logged
  latestBwKg,
  unit,
}: {
  lift: LiftKey;
  label: string;
  bestE1RM: number | null;
  latestBwKg: number | null;
  unit: Unit;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<number | null>(bestE1RM);
  const [rampDone, setRampDone] = useState<Record<number, boolean>>({});
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const bar = unit === "lb" ? LB_BARS[0] : KG_BARS[0];
  const plates = unit === "lb" ? LB_PLATES : KG_PLATES;
  const ramp = target && target > 0 ? testRamp(target, bar, plates) : [];

  const enterAttempts = () => {
    if (!attempts && target) {
      const round = (n: number) => Math.round(n / 2.5) * 2.5;
      setAttempts([
        { weight: round(target * 0.95), reps: 1, success: false },
        { weight: round(target), reps: 1, success: false },
        { weight: round(target * 1.03), reps: 1, success: false },
      ]);
    }
    setStep(2);
  };

  // Same semantics as lib/metrics/strength testMax: a single IS the max,
  // multi-rep attempts back-calculate via Epley.
  const attemptMax = (a: Attempt) =>
    a.reps === 1 ? a.weight : a.weight * (1 + a.reps / 30);
  const best = attempts
    ?.filter((a) => a.success && a.weight > 0 && a.reps > 0)
    .reduce<Attempt | null>(
      (m, a) => (!m || attemptMax(a) > attemptMax(m) ? a : m),
      null
    );
  const bestMaxKg = best ? unitToKg(attemptMax(best), unit) : null;
  const rank =
    bestMaxKg != null ? strengthNextByKey(bestMaxKg, latestBwKg, lift) : null;

  const save = () =>
    start(async () => {
      if (!best) return;
      const res = await logLiftTestAction(lift, unitToKg(best.weight, unit), best.reps);
      if (res.ok) setSaved(true);
      else toast(res.error ?? "Couldn't save.", "error");
    });

  return (
    <div className="card p-6 animate-fade-up">
      {/* progress dots */}
      <div className="flex items-center gap-2 mb-5">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-6 bg-accent" : "w-2.5 bg-surface-2"
            }`}
          />
        ))}
        <span className="ml-auto text-xs text-muted">{STEPS[step]}</span>
      </div>

      {step === 0 && (
        <div>
          <h2 className="font-display font-semibold text-xl">Set your target</h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Aim at the 1RM you think is in you today
            {bestE1RM ? " — prefilled from your best estimated max" : ""}. Plan
            ~30–45 minutes: a long ramp, then up to three heavy singles with
            full rest between them.
          </p>
          <label className="block mt-4">
            <span className="label !mb-1">Target ({unit})</span>
            <input
              type="number"
              inputMode="decimal"
              value={target ?? ""}
              onChange={(e) =>
                setTarget(e.target.value ? Number(e.target.value) : null)
              }
              className="input h-12 stat-num text-lg w-40"
            />
          </label>
          <button
            type="button"
            disabled={!target || target <= 0}
            onClick={() => setStep(1)}
            className="btn-primary mt-5 disabled:opacity-50"
          >
            Start the ramp →
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="font-display font-semibold text-xl">Warm-up ramp</h2>
          <p className="text-sm text-muted mt-2">
            Rest ~1 min between early steps, 2–3 min before the 85%+ singles.
            Nothing here should feel like a grind.
          </p>
          <div className="mt-4 space-y-2">
            {ramp.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRampDone((d) => ({ ...d, [i]: !d[i] }))}
                className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  rampDone[i]
                    ? "border-success/30 bg-success/10"
                    : "border-border bg-surface-2 hover:border-border-strong"
                }`}
              >
                <span
                  className={`grid place-items-center w-6 h-6 rounded-md border ${
                    rampDone[i]
                      ? "bg-success border-success text-success-ink"
                      : "border-border text-transparent"
                  }`}
                >
                  <Check size={14} />
                </span>
                <span className="text-muted w-12 text-left">{r.label}</span>
                <span className="stat-num">
                  {r.weight} {unit} × {r.reps}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button type="button" onClick={() => setStep(0)} className="btn-ghost">
              <ChevronLeft size={15} /> Back
            </button>
            <button type="button" onClick={enterAttempts} className="btn-primary">
              To the attempts →
            </button>
          </div>
        </div>
      )}

      {step === 2 && attempts && (
        <div>
          <h2 className="font-display font-semibold text-xl">Attempts</h2>
          <p className="text-sm text-muted mt-2">
            3–5 minutes rest between attempts. Log what actually happened —
            mark an attempt only when you truly made the lift.
          </p>
          <div className="mt-4 space-y-2.5">
            {attempts.map((a, i) => (
              <div
                key={i}
                className={`grid grid-cols-[2rem_1fr_4rem_3rem] items-center gap-2 rounded-lg px-2 py-2 ${
                  a.success ? "bg-success/5" : ""
                }`}
              >
                <span className="stat-num text-muted text-center">{i + 1}</span>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    aria-label={`Attempt ${i + 1} weight`}
                    value={a.weight || ""}
                    onChange={(e) =>
                      setAttempts((prev) =>
                        prev!.map((x, j) =>
                          j === i ? { ...x, weight: Number(e.target.value) } : x
                        )
                      )
                    }
                    className="input h-12 stat-num pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">
                    {unit}
                  </span>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label={`Attempt ${i + 1} reps`}
                  value={a.reps || ""}
                  onChange={(e) =>
                    setAttempts((prev) =>
                      prev!.map((x, j) =>
                        j === i ? { ...x, reps: Number(e.target.value) } : x
                      )
                    )
                  }
                  className="input h-12 stat-num text-center"
                />
                <button
                  type="button"
                  aria-label={`Attempt ${i + 1} made`}
                  onClick={() =>
                    setAttempts((prev) =>
                      prev!.map((x, j) =>
                        j === i ? { ...x, success: !x.success } : x
                      )
                    )
                  }
                  className={`h-12 rounded-lg border grid place-items-center transition-all ${
                    a.success
                      ? "bg-success border-success text-success-ink"
                      : "border-border text-muted hover:border-success/50"
                  }`}
                >
                  <Check size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button type="button" onClick={() => setStep(1)} className="btn-ghost">
              <ChevronLeft size={15} /> Back
            </button>
            <button
              type="button"
              disabled={!best}
              onClick={() => setStep(3)}
              className="btn-primary disabled:opacity-50"
            >
              See my result →
            </button>
          </div>
        </div>
      )}

      {step === 3 && best && (
        <div>
          {saved ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🏆</div>
              <h2 className="font-display font-semibold text-xl">
                Tested 1RM saved
              </h2>
              <p className="display-num text-4xl mt-3">
                {best.weight} {unit}
              </p>
              {rank && (
                <p className="text-sm text-muted mt-2">
                  That ranks you <span className="text-accent font-semibold">{rank.level}</span> on
                  the {label.toLowerCase()} ladder ({rank.ratio}× bodyweight).
                </p>
              )}
              <Link href="/strength" className="btn-primary mt-6 inline-flex">
                Back to strength profile
              </Link>
            </div>
          ) : (
            <div>
              <h2 className="font-display font-semibold text-xl">Your result</h2>
              <p className="display-num text-4xl mt-4">
                {best.weight} {unit}
                {best.reps > 1 ? ` × ${best.reps}` : ""}
              </p>
              {best.reps > 1 && bestMaxKg != null && (
                <p className="text-sm text-muted mt-1">
                  ≈ {weightNum(bestMaxKg, unit)} {unit} estimated 1RM
                </p>
              )}
              {rank ? (
                <p className="text-sm text-muted mt-3">
                  New rank:{" "}
                  <span className="text-accent font-semibold">{rank.level}</span>{" "}
                  ({rank.ratio}× bodyweight)
                  {rank.next &&
                    ` — ${weightNum(rank.next.deltaKg, unit)} ${unit} to ${rank.next.level}.`}
                </p>
              ) : (
                <p className="text-sm text-muted mt-3">
                  Log a bodyweight to see where this ranks.
                </p>
              )}
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(2)} className="btn-ghost">
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={save}
                  className="btn-primary disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save tested 1RM"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
