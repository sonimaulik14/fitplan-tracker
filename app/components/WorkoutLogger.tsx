"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  restChime,
  fmtClock,
  celebrate,
  celebratePR,
  celebrateWeek,
  celebrateProgram,
} from "@/lib/celebrate";
import { ArrowLeftRight, Target as TargetIcon } from "lucide-react";
import { saveWorkoutAction, swapExerciseAction, resetDayAction } from "@/lib/actions";
import DangerButton from "./DangerButton";
import SwapControl from "./SwapControl";
import WorkoutSummary from "./WorkoutSummary";
import {
  muscleStyle,
  overloadSuggestion,
  weightNum,
  unitToKg,
  termInfo,
  type Unit,
} from "@/lib/ui";
import ExImage from "./ExImage";
import InfoTip from "./InfoTip";
import { MuscleGlyph } from "./icons";
import { ExerciseDemoInline } from "./ExerciseDemo";
import { toast } from "@/lib/toast";

// weight values in Row state are in the user's DISPLAY unit; converted to kg on save.
type Row = {
  planExerciseId: string;
  setNumber: number;
  setType: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  done: boolean;
};

export type LoggerExercise = {
  id: string;
  name: string;
  originalName: string;
  swapped: boolean;
  muscle: string;
  groupLabel: string | null;
  repTarget: string;
  isCardio: boolean;
  warmupSets: number;
  workingSets: number;
  lastTime: { weight: number; reps: number } | null; // kg
  photoUrl?: string; // resolved live photo (Pexels/Unsplash), else local fallback
  rows: Row[]; // weight in kg from server
};

type Meta = { notes: string; mood: string; bodyweight: number | null };

const MOODS = ["", "💪 Strong", "🙂 Good", "😐 Okay", "😴 Tired", "🤕 Sore"];

export default function WorkoutLogger({
  dayId,
  unit,
  exercises: initial,
  initialStatus,
  initialMeta,
}: {
  dayId: string;
  unit: Unit;
  exercises: LoggerExercise[];
  initialStatus: "in_progress" | "completed";
  initialMeta: Meta;
}) {
  // Convert incoming kg weights → display unit for editing.
  const [exercises, setExercises] = useState<LoggerExercise[]>(() =>
    initial.map((ex) => ({
      ...ex,
      rows: ex.rows.map((r) => ({
        ...r,
        weight: r.weight == null ? null : weightNum(r.weight, unit),
      })),
    }))
  );
  const [meta, setMeta] = useState<Meta>({
    ...initialMeta,
    bodyweight:
      initialMeta.bodyweight == null
        ? null
        : weightNum(initialMeta.bodyweight, unit),
  });
  const [status, setStatus] = useState(initialStatus);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState<{
    week: number | null;
    sets: number;
    volume: number;
    exercises: number;
    beat: number;
    programComplete: boolean;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // ---- Rest timer ----------------------------------------------------------
  // Auto-starts when a set is checked done; counts down a per-set-type default,
  // adjustable on the fly, and chimes/vibrates at zero. Pure client-side.
  const REST_DEFAULTS = { warmup: 45, work: 90 };
  const [rest, setRest] = useState<{ remaining: number; total: number } | null>(
    null
  );
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs hold the live countdown so the interval never reads stale state and we
  // keep side-effects (chime/vibrate/toast) OUT of the setState updater.
  const restRemainingRef = useRef(0);
  const restTotalRef = useRef(0);

  const stopRest = useCallback(() => {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
    restRemainingRef.current = 0;
    setRest(null);
  }, []);

  const startRest = useCallback((seconds: number) => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    restRemainingRef.current = seconds;
    restTotalRef.current = seconds;
    setRest({ remaining: seconds, total: seconds });
    restIntervalRef.current = setInterval(() => {
      const next = restRemainingRef.current - 1;
      if (next <= 0) {
        if (restIntervalRef.current) {
          clearInterval(restIntervalRef.current);
          restIntervalRef.current = null;
        }
        restRemainingRef.current = 0;
        setRest(null);
        if (typeof navigator !== "undefined" && navigator.vibrate)
          navigator.vibrate([120, 70, 120]);
        restChime();
        toast("⏱️ Rest over — next set!");
      } else {
        restRemainingRef.current = next;
        setRest({ remaining: next, total: restTotalRef.current });
      }
    }, 1000);
  }, []);

  const adjustRest = (delta: number) => {
    const next = Math.max(1, restRemainingRef.current + delta);
    restRemainingRef.current = next;
    if (next > restTotalRef.current) restTotalRef.current = next;
    setRest({ remaining: next, total: restTotalRef.current });
  };

  // Clear any running interval on unmount.
  useEffect(() => stopRest, [stopRest]);

  // Latest-value refs so the debounced/async save reads current state without
  // re-subscribing. Synced in an effect (not during render) to stay pure under
  // React 19 concurrency; save() also sets statusRef eagerly when needed.
  const statusRef = useRef(status);
  const exRef = useRef(exercises);
  const metaRef = useRef(meta);
  useEffect(() => {
    statusRef.current = status;
    exRef.current = exercises;
    metaRef.current = meta;
  }, [status, exercises, meta]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks unsaved edits (for the beforeunload guard) and serializes writes so
  // two saves can never race — important so a late autosave can't overwrite the
  // "completed" status set by an explicit Mark-complete.
  const dirtyRef = useRef(false);
  type SaveResult = {
    ok: boolean;
    error?: string;
    weekCompleted?: boolean;
    weekNumber?: number;
    programComplete?: boolean;
  };
  const saveChainRef = useRef<Promise<SaveResult>>(Promise.resolve({ ok: true }));

  // Persist current state with `status`, chained after any in-flight save.
  const runSave = (status: "in_progress" | "completed"): Promise<SaveResult> => {
    dirtyRef.current = true;
    const next = saveChainRef.current
      .catch(() => ({ ok: false as const }))
      .then(async (): Promise<SaveResult> => {
        const { sets, meta: m } = buildPayload();
        try {
          const res = await saveWorkoutAction(dayId, sets, status, m);
          if (res.ok) dirtyRef.current = false;
          return res;
        } catch {
          return { ok: false, error: "Network error — check your connection." };
        }
      });
    saveChainRef.current = next;
    return next;
  };

  // Warn before leaving with unsaved (or failed-to-save) edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Build the kg payload from current state.
  const buildPayload = () => ({
    sets: exRef.current.flatMap((ex) =>
      ex.rows.map((r) => ({
        ...r,
        weight: r.weight == null ? null : unitToKg(r.weight, unit),
      }))
    ),
    meta: {
      notes: metaRef.current.notes || null,
      mood: metaRef.current.mood || null,
      bodyweight:
        metaRef.current.bodyweight == null
          ? null
          : unitToKg(metaRef.current.bodyweight, unit),
    },
  });

  // Debounced silent auto-save — preserves current status, no page refresh.
  const queueAutosave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    dirtyRef.current = true;
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      const res = await runSave(statusRef.current);
      if (res.ok) {
        setSaveState("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
      } else {
        setSaveState("error");
        toast(res.error ?? "Could not save.", "error");
      }
    }, 700);
  };

  const update = (exId: string, setNumber: number, patch: Partial<Row>) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exId
          ? ex
          : {
              ...ex,
              rows: ex.rows.map((r) =>
                r.setNumber === setNumber ? { ...r, ...patch } : r
              ),
            }
      )
    );
    queueAutosave();
  };

  const setMetaField = (patch: Partial<Meta>) => {
    setMeta((m) => ({ ...m, ...patch }));
    queueAutosave();
  };

  // Apply a swap: update the displayed exercise immediately (local state, so no
  // refresh needed) AND persist it. Only called from the modal's Save button.
  const applySwap = (exId: string, name: string) => {
    const n = name.trim();
    if (!n) return;
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exId
          ? ex
          : {
              ...ex,
              name: n,
              swapped: n.toLowerCase() !== ex.originalName.toLowerCase(),
            }
      )
    );
    startTransition(async () => {
      // Flush any pending/in-flight set edits first so router.refresh() (which
      // remounts the logger with fresh server props) can't drop unsaved sets.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      await runSave(statusRef.current);
      await swapExerciseAction(exId, n);
      router.refresh();
    });
  };


  // Clear every logged set for this day, locally + on the server, so it's fresh.
  const resetDay = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    stopRest();
    const res = await resetDayAction(dayId);
    if (!res.ok) {
      toast(res.error ?? "Could not reset.", "error");
      return;
    }
    setExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        rows: ex.rows.map((r) => ({
          ...r,
          weight: null,
          reps: null,
          rpe: null,
          done: false,
        })),
      }))
    );
    setMeta({ notes: "", mood: "", bodyweight: null });
    setStatus("in_progress");
    setCollapsed({});
    setSaveState("idle");
    toast("Day reset — start fresh.");
    router.refresh();
  };

  const toggleDone = (exId: string, setNumber: number, currentlyDone: boolean) => {
    update(exId, setNumber, { done: !currentlyDone });
    if (!currentlyDone && typeof navigator !== "undefined" && navigator.vibrate)
      navigator.vibrate(15);
    if (!currentlyDone) {
      // Kick off a rest countdown (skip cardio — those aren't rest-paced sets).
      const ex = exRef.current.find((e) => e.id === exId);
      const row = ex?.rows.find((r) => r.setNumber === setNumber);
      if (ex && row && !ex.isCardio && row.setType !== "cardio") {
        startRest(
          row.setType === "warmup" ? REST_DEFAULTS.warmup : REST_DEFAULTS.work
        );
      }
    } else {
      // Unchecking the set that's resting → cancel the timer.
      stopRest();
    }
    // auto-collapse an exercise once all its sets are checked off
    if (!currentlyDone) {
      setExercises((prev) => {
        const ex = prev.find((e) => e.id === exId);
        if (ex && ex.rows.every((r) => (r.setNumber === setNumber ? true : r.done)))
          setCollapsed((c) => ({ ...c, [exId]: true }));
        return prev;
      });
    }
  };

  // Copy the previous set's weight + reps into this set.
  const copyFromPrev = (exId: string, setNumber: number) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const prevRow = ex.rows.find((r) => r.setNumber === setNumber - 1);
        if (!prevRow) return ex;
        return {
          ...ex,
          rows: ex.rows.map((r) =>
            r.setNumber === setNumber
              ? { ...r, weight: prevRow.weight, reps: prevRow.reps }
              : r
          ),
        };
      })
    );
    queueAutosave();
  };

  const applyToEmpty = (exId: string, weight: number, reps: number) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exId
          ? ex
          : {
              ...ex,
              rows: ex.rows.map((r) =>
                r.setType === "cardio"
                  ? r
                  : { ...r, weight: r.weight ?? weight, reps: r.reps ?? reps }
              ),
            }
      )
    );
    queueAutosave();
  };

  // Append an extra working set at the end of an exercise.
  const addSet = (exId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const max = ex.rows.reduce((m, r) => Math.max(m, r.setNumber), 0);
        return {
          ...ex,
          rows: [
            ...ex.rows,
            {
              planExerciseId: ex.id,
              setNumber: max + 1,
              setType: "work",
              weight: null,
              reps: null,
              rpe: null,
              done: false,
            },
          ],
        };
      })
    );
    queueAutosave();
  };

  // Remove the last working set (keep at least one).
  const removeLastSet = (exId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const works = ex.rows.filter((r) => r.setType === "work");
        if (works.length <= 1) return ex;
        const lastNum = works[works.length - 1].setNumber;
        return { ...ex, rows: ex.rows.filter((r) => r.setNumber !== lastNum) };
      })
    );
    queueAutosave();
  };

  // Quick-log: "100x10" / "100 * 10" → weight + reps in one go.
  const onWeightInput = (exId: string, setNumber: number, raw: string) => {
    const m = raw.match(/^\s*(\d+\.?\d*)\s*[xX*]\s*(\d+)\s*$/);
    if (m) {
      update(exId, setNumber, { weight: Number(m[1]), reps: Number(m[2]) });
    } else {
      update(exId, setNumber, {
        weight: raw ? Number(raw.replace(/[^\d.]/g, "")) || null : null,
      });
    }
  };

  // Enter advances focus to the next numeric field.
  const onFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const fields = Array.from(
      document.querySelectorAll<HTMLInputElement>(".logfield")
    );
    const i = fields.indexOf(e.currentTarget);
    fields[i + 1]?.focus();
  };

  // Explicit save (Complete / Reopen) — refreshes so dashboard/analysis update.
  const save = (finalStatus: "in_progress" | "completed") => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Set eagerly so any autosave that fires before this write commits also
    // carries the final status (belt-and-braces with the serialized chain).
    statusRef.current = finalStatus;
    setSaveState("saving");
    startTransition(async () => {
      const res = await runSave(finalStatus);
      if (res.ok) {
        setStatus(finalStatus);
        setSaveState("saved");
        if (finalStatus === "completed") {
          stopRest();
          // Build the session recap (state weights are already in display unit).
          const doneRows = exRef.current.flatMap((e) =>
            e.rows.filter((r) => r.done).map((r) => ({ r, e }))
          );
          let volume = 0;
          let beat = 0;
          for (const { r, e } of doneRows)
            if (!e.isCardio && r.weight && r.reps) volume += r.weight * r.reps;
          for (const e of exRef.current) {
            if (e.isCardio || !e.lastTime) continue;
            const best = Math.max(
              0,
              ...e.rows.filter((r) => r.done && r.weight).map((r) => r.weight || 0)
            );
            if (best > weightNum(e.lastTime.weight, unit)) beat += 1;
          }
          setSummary({
            week: res.weekCompleted ? (res.weekNumber ?? null) : null,
            sets: doneRows.length,
            volume: Math.round(volume),
            exercises: exRef.current.filter((e) => e.rows.some((r) => r.done))
              .length,
            beat,
            programComplete: !!res.programComplete,
          });
          if (res.programComplete) celebrateProgram();
          else if (res.weekCompleted) celebrateWeek();
          else celebrate();
          // Gold PR burst + toast on top when the session beat a previous best.
          if (beat > 0) {
            setTimeout(celebratePR, 260);
            toast(`${beat} new personal record${beat === 1 ? "" : "s"}!`);
          }
        } else {
          toast("Reopened for editing");
        }
        router.refresh();
      } else {
        setSaveState("error");
        toast(res.error ?? "Could not save.", "error");
      }
    });
  };


  const totalRows = exercises.reduce((n, ex) => n + ex.rows.length, 0);
  const doneRows = exercises.reduce(
    (n, ex) => n + ex.rows.filter((r) => r.done).length,
    0
  );
  const pct = totalRows ? Math.round((doneRows / totalRows) * 100) : 0;
  // Active rest / cardio days are all-cardio — skip the lifting chrome
  // (progress header, focus mode, plate calculator, "how did it go?").
  const isLightDay = exercises.length > 0 && exercises.every((e) => e.isCardio);

  return (
    <div className="space-y-5 pb-28">
      {/* Floating rest timer — auto-starts on set completion, works in both
          normal and focus mode (z above the focus overlay). */}
      {rest && !summary && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 sm:bottom-8 z-[60] w-[min(92vw,26rem)] animate-fade-up">
          <div
            className="rounded-2xl border border-border-strong bg-surface-solid/95 backdrop-blur-xl px-4 py-3 shadow-2xl"
            style={{ boxShadow: "0 20px 50px -12px rgba(0,0,0,0.6)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl leading-none">⏱️</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-muted font-semibold">
                    Rest
                  </span>
                  <span className="font-display font-bold text-lg tabular-nums">
                    {fmtClock(rest.remaining)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-1.5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(rest.remaining / rest.total) * 100}%`,
                      transition: "width 1s linear",
                      background: "var(--grad-brand)",
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => adjustRest(-15)}
                className="btn-ghost !py-1.5 !px-3 text-xs flex-1"
              >
                −15s
              </button>
              <button
                type="button"
                onClick={() => adjustRest(15)}
                className="btn-ghost !py-1.5 !px-3 text-xs flex-1"
              >
                +15s
              </button>
              <button
                type="button"
                onClick={stopRest}
                className="btn-primary !py-1.5 !px-3 text-xs flex-1"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
      {summary && (
        <WorkoutSummary
          summary={summary}
          unit={unit}
          onClose={() => setSummary(null)}
        />
      )}
      {/* Progress header */}
      {!isLightDay && (
      <div className="card !bg-surface-solid p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">
            <span className="text-foreground font-bold text-base">{doneRows}</span>{" "}
            / {totalRows} sets logged
          </span>
          <span
            className={`shrink-0 text-xs font-semibold tabular-nums ${
              saveState === "error" ? "text-danger" : "text-muted"
            }`}
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved ✓"
                : saveState === "error"
                  ? "⚠ Not saved"
                  : `${pct}%`}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-2.5">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: "var(--grad-brand)" }}
          />
        </div>
        {status === "completed" && (
          <div className="mt-3">
            <span className="chip text-accent-2 border-accent-2/30 bg-accent-2/10">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-2" /> Workout complete
            </span>
          </div>
        )}
      </div>
      )}

      {exercises.map((ex, idx) => {
        const st = muscleStyle(ex.muscle);
        const sg = overloadSuggestion(ex.lastTime, ex.repTarget, ex.isCardio);
        const sgWeight = sg ? weightNum(sg.weight, unit) : 0;
        const isCollapsed = collapsed[ex.id] ?? false;
        const exDone = ex.rows.filter((r) => r.done).length;
        return (
          <div
            key={ex.id}
            className="card p-5 sm:p-6 relative overflow-hidden animate-fade-up"
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <span
              className="absolute left-0 top-5 bottom-5 w-1 rounded-full opacity-70"
              style={{ background: st.color }}
            />
            <div className="flex items-start justify-between gap-3 pl-2.5">
              <div className="flex items-start gap-3 min-w-0">
                {ex.photoUrl ? (
                  <Image
                    src={ex.photoUrl}
                    alt={ex.muscle}
                    width={56}
                    height={56}
                    sizes="56px"
                    className="w-14 h-14 rounded-xl object-cover border border-border duotone shrink-0"
                  />
                ) : (
                  <ExImage
                    srcKey={st.key}
                    alt={ex.muscle}
                    className="w-14 h-14 rounded-xl object-cover border border-border duotone shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ex.groupLabel &&
                      (() => {
                        const info = termInfo(ex.groupLabel);
                        const chip = (
                          <span className="chip text-accent-2 border-accent-2/30 bg-accent-2/10 !py-0.5">
                            {ex.groupLabel}
                          </span>
                        );
                        return info ? (
                          <InfoTip
                            title={info.title}
                            desc={info.desc}
                            className="text-accent-2"
                          >
                            {chip}
                          </InfoTip>
                        ) : (
                          chip
                        );
                      })()}
                    <span className="text-xs text-muted flex items-center gap-1">
                      <MuscleGlyph muscle={ex.muscle} size={14} /> {ex.muscle}
                    </span>
                  </div>
                  <h3 className="font-semibold mt-1 flex items-center gap-2 flex-wrap">
                    {ex.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {!ex.isCardio && <ExerciseDemoInline name={ex.name} />}
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-semibold">
                      <TargetIcon size={13} className="text-accent shrink-0" />
                      <span className="text-muted font-medium">Target</span>
                      <span className="text-foreground tabular-nums">
                        {ex.repTarget}
                      </span>
                    </span>
                    {ex.swapped && (
                      <span className="inline-flex items-center gap-1 text-xs text-accent-2">
                        <ArrowLeftRight size={11} /> swapped from{" "}
                        {ex.originalName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [ex.id]: !isCollapsed }))
                  }
                  aria-label={isCollapsed ? "Expand exercise" : "Collapse exercise"}
                  className="grid place-items-center w-7 h-7 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                  >
                    <path
                      d="m6 9 6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {!isCollapsed && ex.lastTime && !ex.isCardio && (
                  <button
                    type="button"
                    onClick={() =>
                      applyToEmpty(
                        ex.id,
                        weightNum(ex.lastTime!.weight, unit),
                        ex.lastTime!.reps
                      )
                    }
                    className="text-right rounded-xl border border-border bg-surface-2 px-3 py-2 hover:border-accent-2/40 transition-colors"
                    title="Fill empty sets with last time's numbers"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-muted">
                      Last time
                    </div>
                    <div className="text-sm font-display font-bold">
                      {weightNum(ex.lastTime.weight, unit)} × {ex.lastTime.reps}
                    </div>
                    <div className="text-[11px] text-accent-2 font-semibold">
                      ↺ Use
                    </div>
                  </button>
                )}
                {!ex.isCardio && (
                  <SwapControl
                    current={ex.name}
                    original={ex.originalName}
                    muscle={ex.muscle}
                    onSwap={(name) => applySwap(ex.id, name)}
                  />
                )}
              </div>
            </div>

            {isCollapsed && (
              <div className="mt-3 pl-2.5 text-sm text-muted">
                {exDone}/{ex.rows.length} sets done — tap to expand
              </div>
            )}

            {!isCollapsed && sg && (
              <div className="mt-4 ml-2.5 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2">
                <TargetIcon size={14} className="text-accent shrink-0" aria-hidden />
                <div className="text-sm flex-1 min-w-0">
                  <span className="text-muted">Tip: </span>
                  <span className="font-semibold">{sg.label}</span>
                  <span className="text-muted">
                    {" "}
                    → try{" "}
                    <span className="text-foreground font-display font-bold">
                      {sgWeight} × {sg.reps}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => applyToEmpty(ex.id, sgWeight, sg.reps)}
                  className="shrink-0 text-xs font-semibold text-accent hover:underline"
                >
                  Apply
                </button>
              </div>
            )}

            {!isCollapsed && (
            <div className="mt-5 space-y-2.5 pl-2.5">
              {ex.rows.map((r) => (
                <div
                  key={r.setNumber}
                  className={`grid items-center gap-2 rounded-xl px-2 py-2 transition-colors ${
                    ex.isCardio
                      ? "grid-cols-[3rem_1fr_auto]"
                      : "grid-cols-[2.6rem_1fr_1fr_3rem_2.5rem]"
                  } ${r.done ? "bg-accent-2/5" : ""}`}
                >
                  <div className="text-xs">
                    {r.setType === "cardio" ? (
                      <span className="text-muted">Cardio</span>
                    ) : r.setType === "warmup" ? (
                      <span className="text-muted">W-up</span>
                    ) : r.setNumber > 1 ? (
                      <button
                        type="button"
                        onClick={() => copyFromPrev(ex.id, r.setNumber)}
                        title="Copy the set above"
                        className="inline-grid place-items-center w-7 h-7 rounded-lg bg-surface-2 border border-border font-semibold hover:border-accent hover:text-accent transition-colors"
                      >
                        {r.setNumber - ex.warmupSets}
                      </button>
                    ) : (
                      <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-surface-2 border border-border font-semibold">
                        {r.setNumber - ex.warmupSets}
                      </span>
                    )}
                  </div>

                  {ex.isCardio ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="minutes"
                      aria-label={`${ex.name} set ${r.setNumber} minutes`}
                      className="input py-2 logfield"
                      onKeyDown={onFieldKeyDown}
                      value={r.reps ?? ""}
                      onChange={(e) =>
                        update(ex.id, r.setNumber, {
                          reps: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="wt  (or 100x10)"
                          aria-label={`${ex.name} set ${r.setNumber} weight in ${unit}`}
                          className="input py-2 pr-7 logfield"
                          onKeyDown={onFieldKeyDown}
                          value={r.weight ?? ""}
                          onChange={(e) =>
                            onWeightInput(ex.id, r.setNumber, e.target.value)
                          }
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted pointer-events-none">
                          {unit}
                        </span>
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="reps"
                        aria-label={`${ex.name} set ${r.setNumber} reps`}
                        className="input py-2 logfield"
                        onKeyDown={onFieldKeyDown}
                        value={r.reps ?? ""}
                        onChange={(e) =>
                          update(ex.id, r.setNumber, {
                            reps: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                      {r.setType === "work" ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="RPE"
                          title="Rate of Perceived Exertion (1-10)"
                          aria-label={`${ex.name} set ${r.setNumber} RPE`}
                          className="input py-2 px-1.5 text-center logfield"
                          onKeyDown={onFieldKeyDown}
                          value={r.rpe ?? ""}
                          onChange={(e) =>
                            update(ex.id, r.setNumber, {
                              rpe: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                        />
                      ) : (
                        <span className="text-center text-muted text-xs">—</span>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleDone(ex.id, r.setNumber, r.done)}
                    aria-label="mark set done"
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                      r.done
                        ? "bg-accent-2 border-accent-2 text-[#05231a] shadow-lg shadow-accent-2/30"
                        : "border-border text-muted hover:border-accent-2/50"
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12.5 10 17l9-10"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}
              {!ex.isCardio && (
                <div className="flex gap-4 pt-3 pl-2.5">
                  <button
                    type="button"
                    onClick={() => addSet(ex.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/15 transition-colors"
                  >
                    + Add set
                  </button>
                  {ex.rows.filter((r) => r.setType === "work").length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLastSet(ex.id)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      − Remove last
                    </button>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        );
      })}

      {/* Session notes / mood / bodyweight */}
      {!isLightDay && (
      <div className="card p-5 space-y-4 animate-fade-up">
        <h3 className="font-semibold">How did it go?</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="bw">
              Bodyweight ({unit})
            </label>
            <input
              id="bw"
              type="number"
              inputMode="decimal"
              placeholder="optional"
              className="input"
              value={meta.bodyweight ?? ""}
              onChange={(e) =>
                setMetaField({
                  bodyweight: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="mood">
              Mood
            </label>
            <select
              id="mood"
              className="input"
              value={meta.mood}
              onChange={(e) => setMetaField({ mood: e.target.value })}
            >
              {MOODS.map((mo) => (
                <option key={mo} value={mo} className="bg-surface-solid">
                  {mo === "" ? "—" : mo}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            className="input resize-none"
            placeholder="training / nutrition / supplement notes…"
            value={meta.notes}
            onChange={(e) => setMetaField({ notes: e.target.value })}
          />
        </div>
      </div>
      )}

      {/* Reset this day */}
      <div className="flex justify-center pt-2">
        <DangerButton
          label="↺ Reset this day"
          title="Reset this day?"
          message="This clears every set you've logged for this workout so you can start it over. This can't be undone."
          confirmLabel="Reset day"
          onConfirm={resetDay}
        />
      </div>

      {/* Sticky action bar (sits above mobile tab bar) */}
      <div className="fixed bottom-[calc(66px+env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <span
            className={`text-xs ${
              saveState === "error" ? "text-danger font-semibold" : "text-muted"
            }`}
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "All changes saved ✓"
                : saveState === "error"
                  ? "⚠ Not saved — keep this page open"
                  : "Changes save automatically"}
          </span>
          <div className="ml-auto flex gap-2">
            {status === "completed" ? (
              <button
                className="btn-ghost"
                onClick={() => save("in_progress")}
                disabled={pending}
              >
                Reopen
              </button>
            ) : (
              <button
                className="btn-primary !px-5"
                onClick={() => save("completed")}
                disabled={pending}
              >
                {pending ? "Saving…" : "Mark complete"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

