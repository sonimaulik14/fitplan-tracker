"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Pill } from "lucide-react";
import { toggleSupplementAction } from "@/lib/actions";

type Supp = { name: string; dose: number | null; unit: string; taken: boolean };

// Per-day supplement logging — a tap-to-toggle grid shown on the workout page,
// so you log what you took in the context of that day's session. Writes to
// today's log (same store as the Nutrition page).
export default function DaySupplements({ supplements }: { supplements: Supp[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  // optimistic local state so toggles feel instant
  const [items, setItems] = useState(supplements);

  const taken = items.filter((s) => s.taken).length;

  const toggle = async (name: string) => {
    setItems((prev) =>
      prev.map((s) => (s.name === name ? { ...s, taken: !s.taken } : s))
    );
    setPending(name);
    await toggleSupplementAction(name);
    setPending(null);
    router.refresh();
  };

  if (items.length === 0)
    return (
      <section className="card p-5 sm:p-6 animate-fade-up">
        <h2 className="section-title mb-2">
          <Pill size={17} className="text-accent" aria-hidden /> Supplements
        </h2>
        <p className="text-sm text-muted">
          No supplements set up yet.{" "}
          <Link href="/nutrition" className="text-accent font-semibold hover:underline">
            Add them in Nutrition
          </Link>{" "}
          and they&apos;ll appear here to log each day.
        </p>
      </section>
    );

  return (
    <section className="card p-5 sm:p-6 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">
          <Pill size={17} className="text-accent" aria-hidden /> Supplements
        </h2>
        <span className="text-xs font-semibold text-muted tabular-nums">
          {taken}/{items.length} taken
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {items.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => toggle(s.name)}
            disabled={pending === s.name}
            aria-pressed={s.taken}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.97] disabled:opacity-60 ${
              s.taken
                ? "border-accent-2/45 bg-accent-2/10"
                : "border-border bg-surface-2 hover:border-border-strong"
            }`}
          >
            <span
              className={`grid place-items-center w-5 h-5 rounded-md shrink-0 transition-colors ${
                s.taken
                  ? "bg-accent-2 text-[#05231a]"
                  : "border border-border-strong"
              }`}
            >
              {s.taken && <Check size={13} strokeWidth={3} aria-hidden />}
            </span>
            <span className="min-w-0">
              <span
                className={`block text-sm font-medium truncate ${
                  s.taken ? "text-foreground" : ""
                }`}
              >
                {s.name}
              </span>
              {s.dose ? (
                <span className="block text-[11px] text-muted">
                  {s.dose}
                  {s.unit ? ` ${s.unit}` : ""}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
