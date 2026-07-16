"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Lock, Moon, Plus, Trash2 } from "lucide-react";
import {
  savePlanAction,
  type PlanDraft,
  type DraftWeek,
  type DraftDay,
  type DraftExercise,
} from "@/lib/actions/plans";
import { ALTERNATIVES } from "@/lib/alternatives";
import { toast } from "@/lib/toast";

const MUSCLES = [
  "Legs",
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Calves",
  "Abs",
  "Cardio",
  "Other",
] as const;

// Flat, de-duplicated catalog for the name autocomplete.
const EXERCISE_NAMES = Array.from(
  new Set(Object.values(ALTERNATIVES).flat().map((a) => a.name))
).sort();
const LIST_ID = "plan-builder-exercises";

/* ---------- starter draft (used when no `initial` is passed) ---------- */

const restDay = (n: number): DraftDay => ({
  dayNumber: n,
  label: "Rest",
  focus: "Rest",
  exercises: [],
});

const starterWeek = (number: number): DraftWeek => ({
  number,
  style: null,
  days: Array.from({ length: 7 }, (_, i) =>
    [1, 3, 5].includes(i + 1)
      ? { dayNumber: i + 1, label: `Day ${i + 1}`, focus: "Full Body", exercises: [] }
      : restDay(i + 1)
  ),
});

const starterDraft = (): PlanDraft => ({
  name: "",
  description: "",
  weeks: [1, 2, 3, 4].map(starterWeek),
});

/* ---------- lightweight mirror of the server validation, for the hint bar ---------- */

function firstIssue(d: PlanDraft): string | null {
  const name = d.name.trim();
  if (name.length < 3) return "Give the program a name (3–60 characters).";
  let count = 0;
  for (const w of d.weeks)
    for (const day of w.days) {
      const at = `Week ${w.number}, day ${day.dayNumber}`;
      if (!day.focus.trim()) return `${at}: set a focus (e.g. Push, Legs).`;
      if (!day.label.trim()) return `${at}: set a label.`;
      for (const ex of day.exercises) {
        count++;
        if (!ex.name.trim()) return `${at}: every exercise needs a name.`;
        if (!ex.repTarget.trim())
          return `"${ex.name}": set a ${ex.isCardio ? "duration (e.g. 20 min)" : "rep target (e.g. 8-12)"}.`;
        if (!ex.isCardio && ex.warmupSets + ex.workingSets < 1)
          return `"${ex.name}": add at least one set.`;
      }
    }
  if (count === 0) return "Add at least one exercise to the program.";
  return null;
}

/* ---------- small field pieces ---------- */

function NumField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="w-[4.25rem]">
      <span className="label !mb-1">{label}</span>
      <input
        type="number"
        min={0}
        max={10}
        step={1}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Math.round(Number(e.target.value));
          onChange(Math.max(0, Math.min(10, Number.isNaN(n) ? 0 : n)));
        }}
        className="input !py-2 text-sm stat-num"
      />
    </label>
  );
}

function ExerciseRow({
  ex,
  locked,
  onChange,
  onRemove,
}: {
  ex: DraftExercise;
  locked: boolean;
  onChange: (patch: Partial<DraftExercise>) => void;
  onRemove: () => void;
}) {
  const [showLabel, setShowLabel] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 p-3">
      <div className="flex items-center gap-2">
        <input
          list={LIST_ID}
          value={ex.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Exercise name"
          maxLength={80}
          disabled={locked}
          className="input !py-2 text-sm flex-1"
        />
        {!locked && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${ex.name || "exercise"}`}
            className="grid place-items-center w-8 h-8 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
          >
            <Trash2 size={15} aria-hidden />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2 mt-2">
        <label className="flex-1 min-w-28">
          <span className="label !mb-1">Muscle</span>
          <select
            value={ex.muscle}
            onChange={(e) => onChange({ muscle: e.target.value })}
            disabled={locked}
            className="input !py-2 text-sm"
          >
            {MUSCLES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        {!ex.isCardio && (
          <>
            <NumField
              label="Warmup"
              value={ex.warmupSets}
              onChange={(warmupSets) => onChange({ warmupSets })}
              disabled={locked}
            />
            <NumField
              label="Work"
              value={ex.workingSets}
              onChange={(workingSets) => onChange({ workingSets })}
              disabled={locked}
            />
          </>
        )}
        <label className={ex.isCardio ? "flex-1 min-w-28" : "w-20"}>
          <span className="label !mb-1">{ex.isCardio ? "Duration" : "Reps"}</span>
          <input
            value={ex.repTarget}
            onChange={(e) => onChange({ repTarget: e.target.value })}
            placeholder={ex.isCardio ? "20 min" : "8-12"}
            maxLength={20}
            disabled={locked}
            className="input !py-2 text-sm stat-num"
          />
        </label>
      </div>
      <div className="flex items-center gap-3 mt-2.5">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={ex.isCardio}
            disabled={locked}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { isCardio: true, warmupSets: 0, workingSets: Math.max(1, ex.workingSets) }
                  : { isCardio: false }
              )
            }
            className="w-4 h-4 accent-[var(--accent)]"
          />
          Cardio
        </label>
        {showLabel || ex.groupLabel ? (
          <input
            value={ex.groupLabel ?? ""}
            onChange={(e) => onChange({ groupLabel: e.target.value || null })}
            placeholder="e.g. Superset A"
            maxLength={30}
            disabled={locked}
            className="input !py-1.5 !px-2.5 text-xs w-36"
          />
        ) : (
          !locked && (
            <button
              type="button"
              onClick={() => setShowLabel(true)}
              className="btn-quiet !py-1 text-xs"
            >
              + label
            </button>
          )
        )}
      </div>
    </div>
  );
}

function DayCard({
  day,
  locked,
  onChange,
  onToggleRest,
  canCopy,
  onCopy,
}: {
  day: DraftDay;
  locked: boolean;
  onChange: (day: DraftDay) => void;
  onToggleRest: () => void;
  canCopy: boolean;
  onCopy: () => void;
}) {
  const rest = day.focus === "Rest";
  const addExercise = () => {
    const muscle = (MUSCLES as readonly string[]).includes(day.focus) ? day.focus : "Other";
    onChange({
      ...day,
      exercises: [
        ...day.exercises,
        { name: "", muscle, groupLabel: null, warmupSets: 1, workingSets: 3, repTarget: "", isCardio: false },
      ],
    });
  };
  return (
    <section className={`card p-4 ${rest ? "opacity-75" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">Day {day.dayNumber}</span>
        <button
          type="button"
          onClick={onToggleRest}
          disabled={locked}
          aria-pressed={rest}
          className={`chip transition-colors disabled:opacity-50 ${
            rest
              ? "text-accent border-accent/40 bg-accent/10"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Moon size={12} aria-hidden /> Rest day
        </button>
      </div>
      {rest ? (
        <p className="text-sm text-muted mt-3">Rest day — recovery is part of the program.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <label>
              <span className="label !mb-1">Label</span>
              <input
                value={day.label}
                onChange={(e) => onChange({ ...day, label: e.target.value })}
                placeholder={`Day ${day.dayNumber}`}
                maxLength={60}
                disabled={locked}
                className="input !py-2 text-sm"
              />
            </label>
            <label>
              <span className="label !mb-1">Focus</span>
              <input
                value={day.focus}
                onChange={(e) => onChange({ ...day, focus: e.target.value })}
                placeholder="e.g. Push"
                maxLength={60}
                disabled={locked}
                className="input !py-2 text-sm"
              />
            </label>
          </div>
          {day.exercises.length > 0 && (
            <div className="mt-3 space-y-2">
              {day.exercises.map((ex, i) => (
                <ExerciseRow
                  key={i}
                  ex={ex}
                  locked={locked}
                  onChange={(patch) =>
                    onChange({
                      ...day,
                      exercises: day.exercises.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                    })
                  }
                  onRemove={() =>
                    onChange({ ...day, exercises: day.exercises.filter((_, j) => j !== i) })
                  }
                />
              ))}
            </div>
          )}
          {!locked && (
            <div className="flex items-center gap-2 mt-3">
              {day.exercises.length < 15 && (
                <button type="button" onClick={addExercise} className="btn-quiet text-xs">
                  <Plus size={13} aria-hidden /> Add exercise
                </button>
              )}
              {day.exercises.length === 0 && canCopy && (
                <button type="button" onClick={onCopy} className="btn-quiet text-xs">
                  <Copy size={13} aria-hidden /> Copy previous day
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- the builder ---------- */

export default function PlanBuilder({
  initial,
  locked = false,
}: {
  initial?: PlanDraft;
  locked?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<PlanDraft>(() => initial ?? starterDraft());
  const [weekIdx, setWeekIdx] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, start] = useTransition();
  // Pre-rest snapshots so "Rest day" can be toggled off without losing work.
  const restStash = useRef(new Map<string, DraftDay>());

  const wi = Math.min(weekIdx, draft.weeks.length - 1);
  const week = draft.weeks[wi];
  const issue = useMemo(() => firstIssue(draft), [draft]);
  const exerciseCount = useMemo(
    () => draft.weeks.reduce((n, w) => n + w.days.reduce((m, d) => m + d.exercises.length, 0), 0),
    [draft]
  );

  const patchWeek = (w: DraftWeek) =>
    setDraft((d) => ({ ...d, weeks: d.weeks.map((x, i) => (i === wi ? w : x)) }));
  const patchDay = (di: number, day: DraftDay) =>
    patchWeek({ ...week, days: week.days.map((x, i) => (i === di ? day : x)) });

  const toggleRest = (di: number) => {
    const day = week.days[di];
    const key = `${week.number}:${day.dayNumber}`;
    if (day.focus === "Rest") {
      patchDay(di, restStash.current.get(key) ?? {
        dayNumber: day.dayNumber,
        label: `Day ${day.dayNumber}`,
        focus: "",
        exercises: [],
      });
    } else {
      restStash.current.set(key, day);
      patchDay(di, restDay(day.dayNumber));
    }
  };

  // Nearest earlier training day that has exercises (looks across weeks).
  const copySource = (di: number): DraftDay | null => {
    for (let w = wi; w >= 0; w--)
      for (let d = w === wi ? di - 1 : 6; d >= 0; d--) {
        const c = draft.weeks[w].days[d];
        if (c.focus !== "Rest" && c.exercises.length > 0) return c;
      }
    return null;
  };
  const copyPrev = (di: number) => {
    const src = copySource(di);
    if (!src) return;
    const day = week.days[di];
    patchDay(di, {
      dayNumber: day.dayNumber,
      label: day.label.trim() ? day.label : src.label,
      focus: day.focus.trim() ? day.focus : src.focus,
      exercises: src.exercises.map((e) => ({ ...e })),
    });
  };

  const addWeek = () => {
    if (draft.weeks.length >= 16) return;
    const weeks = [...draft.weeks, starterWeek(draft.weeks.length + 1)];
    setDraft({ ...draft, weeks });
    setWeekIdx(weeks.length - 1);
  };
  const duplicateWeek = () => {
    if (draft.weeks.length >= 16) return;
    const copy: DraftWeek = {
      number: draft.weeks.length + 1,
      style: week.style,
      days: week.days.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e })) })),
    };
    const weeks = [...draft.weeks, copy];
    setDraft({ ...draft, weeks });
    setWeekIdx(weeks.length - 1);
  };
  const removeLastWeek = () => {
    if (draft.weeks.length <= 1) return;
    const weeks = draft.weeks.slice(0, -1);
    setDraft({ ...draft, weeks });
    setWeekIdx(weeks.length - 1);
    setConfirmRemove(false);
  };

  const save = () =>
    start(async () => {
      const res = await savePlanAction(draft);
      if (res.ok) {
        // A locked edit succeeds but only saves name/description — the server
        // explains that in `error`; surface it as info rather than success.
        toast(res.error ?? (draft.id ? "Program updated." : "Program created."), res.error ? "info" : "success");
        router.push("/plans");
      } else {
        toast(res.error ?? "Couldn't save the program.", "error");
      }
    });

  // Leave without saving (falls back to /plans when opened in a fresh tab).
  const cancel = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/plans");
  };

  const onLastWeek = wi === draft.weeks.length - 1;

  return (
    <div className="animate-fade-up">
      <datalist id={LIST_ID}>
        {EXERCISE_NAMES.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {locked && (
        <div className="card flex items-center gap-3 border-warn/30 px-4 py-3 mb-5 text-sm">
          <Lock size={15} className="text-warn shrink-0" aria-hidden />
          <p>
            Workouts are logged against this program — only name &amp; description can be
            edited.
          </p>
        </div>
      )}

      {/* Name / description */}
      <div className="card p-5 sm:p-6">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Name your program"
          maxLength={60}
          aria-label="Program name"
          className="w-full bg-transparent outline-none font-display font-bold text-3xl sm:text-4xl placeholder:text-muted/50 border-b-2 border-transparent focus:border-accent transition-colors pb-1"
        />
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="What's this program about? (optional)"
          maxLength={300}
          rows={2}
          aria-label="Program description"
          className="input mt-4 text-sm resize-none"
        />
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="chip text-accent border-accent/30 bg-accent/10">
            {draft.weeks.length} {draft.weeks.length === 1 ? "week" : "weeks"}
          </span>
          <span className="chip">
            <span className="stat-num">{exerciseCount}</span> exercises
          </span>
        </div>
      </div>

      {/* Week tabs */}
      <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1.5 -mx-1 px-1">
        {draft.weeks.map((w, i) => (
          <button
            key={w.number}
            type="button"
            onClick={() => {
              setWeekIdx(i);
              setConfirmRemove(false);
            }}
            aria-pressed={i === wi}
            className={`chip shrink-0 !px-3.5 !py-1.5 transition-colors ${
              i === wi ? "brand-bg !border-transparent" : "text-muted hover:text-foreground"
            }`}
          >
            W{w.number}
          </button>
        ))}
        {!locked && draft.weeks.length < 16 && (
          <button
            type="button"
            onClick={addWeek}
            className="chip shrink-0 !px-3.5 !py-1.5 border-dashed text-muted hover:text-foreground hover:border-border-strong transition-colors"
          >
            <Plus size={12} aria-hidden /> Add week
          </button>
        )}
      </div>

      {/* Selected week toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
        <label className="flex items-center gap-2.5">
          <span className="eyebrow whitespace-nowrap">Week {week.number} style</span>
          <input
            value={week.style ?? ""}
            onChange={(e) => patchWeek({ ...week, style: e.target.value || null })}
            placeholder="e.g. GVT"
            maxLength={40}
            disabled={locked}
            className="input !py-1.5 w-32 text-sm"
          />
        </label>
        {!locked && (
          <div className="ml-auto flex items-center gap-2">
            {draft.weeks.length < 16 && (
              <button type="button" onClick={duplicateWeek} className="btn-ghost !py-1.5 !px-3 text-xs">
                <Copy size={13} aria-hidden /> Duplicate week
              </button>
            )}
            {onLastWeek && draft.weeks.length > 1 &&
              (confirmRemove ? (
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-danger">Remove W{week.number}?</span>
                  <button
                    type="button"
                    onClick={removeLastWeek}
                    className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-danger hover:bg-danger/20 transition-colors"
                  >
                    Remove
                  </button>
                  <button type="button" onClick={() => setConfirmRemove(false)} className="btn-ghost !py-1.5 !px-2.5 text-xs">
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRemove(true)}
                  className="btn-ghost !py-1.5 !px-3 text-xs text-danger"
                >
                  <Trash2 size={13} aria-hidden /> Remove week
                </button>
              ))}
          </div>
        )}
      </div>

      {/* 7 day cards */}
      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        {week.days.map((day, di) => (
          <DayCard
            key={`${week.number}-${day.dayNumber}`}
            day={day}
            locked={locked}
            onChange={(d) => patchDay(di, d)}
            onToggleRest={() => toggleRest(di)}
            canCopy={copySource(di) !== null}
            onCopy={() => copyPrev(di)}
          />
        ))}
      </div>

      {/* Sticky action bar (sits above the mobile tab bar) */}
      <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] md:bottom-0 z-30 border-t border-border bg-background md:pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-3">
          <p
            className={`text-xs flex-1 min-w-0 truncate ${
              issue ? "text-warn font-semibold" : "text-muted"
            }`}
            aria-live="polite"
          >
            {issue ??
              `Ready to save — ${exerciseCount} exercises across ${draft.weeks.length} ${
                draft.weeks.length === 1 ? "week" : "weeks"
              }.`}
          </p>
          <button type="button" onClick={cancel} disabled={pending} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={pending} className="btn-primary">
            {pending ? "Saving…" : draft.id ? "Save changes" : "Save program"}
          </button>
        </div>
      </div>
    </div>
  );
}
