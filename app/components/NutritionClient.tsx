"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addNutritionEntryAction,
  deleteNutritionEntryAction,
  adjustWaterAction,
  setNutritionGoalsAction,
} from "@/lib/actions";
import { toast } from "@/lib/toast";
import { UtensilsCrossed, Plus, X } from "lucide-react";
import type { Supplement } from "@/lib/ui";
import EmptyState from "./EmptyState";

type Entry = {
  id: string;
  label: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export function FoodLog({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    label: "",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  });
  const [busy, setBusy] = useState(false);

  const num = (s: string) => (s.trim() ? Number(s) : 0);

  const add = async () => {
    if (!f.label.trim()) {
      toast("Name your food");
      return;
    }
    setBusy(true);
    const res = await addNutritionEntryAction({
      label: f.label,
      calories: num(f.calories),
      proteinG: num(f.proteinG),
      carbsG: num(f.carbsG),
      fatG: num(f.fatG),
    });
    setBusy(false);
    if (res.ok) {
      setF({ label: "", calories: "", proteinG: "", carbsG: "", fatG: "" });
      router.refresh();
    } else toast(res.error ?? "Could not add");
  };

  const del = async (id: string) => {
    await deleteNutritionEntryAction(id);
    router.refresh();
  };

  return (
    <div>
      <div className="space-y-2 mb-4">
        {entries.length === 0 && (
          <EmptyState
            compact
            Icon={UtensilsCrossed}
            title="No food logged yet"
            description="Add your first meal below to start tracking calories and macros for today."
          />
        )}
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-3 rounded-xl bg-surface-2 border border-border px-3.5 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{e.label}</div>
              <div className="text-xs text-muted">
                {Math.round(e.calories)} kcal · P{Math.round(e.proteinG)} · C
                {Math.round(e.carbsG)} · F{Math.round(e.fatG)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => del(e.id)}
              className="text-muted hover:text-red-400 text-lg shrink-0"
              aria-label="Delete entry"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <input
          value={f.label}
          onChange={(e) => setF({ ...f, label: e.target.value })}
          placeholder="Food"
          className="input col-span-2"
        />
        <input
          value={f.calories}
          onChange={(e) => setF({ ...f, calories: e.target.value })}
          placeholder="kcal"
          inputMode="decimal"
          className="input"
        />
        <input
          value={f.proteinG}
          onChange={(e) => setF({ ...f, proteinG: e.target.value })}
          placeholder="P"
          inputMode="decimal"
          className="input"
        />
        <input
          value={f.carbsG}
          onChange={(e) => setF({ ...f, carbsG: e.target.value })}
          placeholder="C"
          inputMode="decimal"
          className="input"
        />
        <input
          value={f.fatG}
          onChange={(e) => setF({ ...f, fatG: e.target.value })}
          placeholder="F"
          inputMode="decimal"
          className="input"
        />
      </div>
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="btn-primary w-full mt-2 disabled:opacity-60"
      >
        {busy ? "Adding…" : "+ Add food"}
      </button>
    </div>
  );
}

export function WaterTracker({
  waterMl,
  goalMl = 3000,
  stepMl = 250,
}: {
  waterMl: number;
  goalMl?: number;
  stepMl?: number;
}) {
  const router = useRouter();
  const [ml, setMl] = useState(waterMl);
  const glasses = Math.round(ml / stepMl);
  const goalGlasses = Math.round(goalMl / stepMl);
  const pct = Math.min(100, Math.round((ml / goalMl) * 100));

  const adjust = async (delta: number) => {
    setMl((m) => Math.max(0, m + delta));
    const res = await adjustWaterAction(delta);
    if (res.ok && typeof res.waterMl === "number") setMl(res.waterMl);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display font-bold text-2xl">
            {(ml / 1000).toFixed(2)}
            <span className="text-base text-muted"> / {(goalMl / 1000).toFixed(1)} L</span>
          </div>
          <div className="text-xs text-muted">
            {glasses} of {goalGlasses} glasses
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => adjust(-stepMl)}
            className="w-10 h-10 rounded-xl border border-border hover:bg-surface-2 text-xl"
            aria-label="Remove a glass"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => adjust(stepMl)}
            className="w-10 h-10 rounded-xl bg-accent text-white text-xl"
            aria-label="Add a glass"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: goalGlasses }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-6 rounded-md transition-colors ${
              i < glasses ? "bg-accent" : "bg-surface-2"
            }`}
          />
        ))}
      </div>
      <div className="text-right text-xs text-muted mt-1">{pct}%</div>
    </div>
  );
}

export function NutritionGoals({
  calorieGoal,
  proteinGoal,
  supplements,
}: {
  calorieGoal: number | null;
  proteinGoal: number | null;
  supplements: Supplement[];
}) {
  const router = useRouter();
  const [cal, setCal] = useState(calorieGoal != null ? String(calorieGoal) : "");
  const [pro, setPro] = useState(proteinGoal != null ? String(proteinGoal) : "");
  const [sups, setSups] = useState<Supplement[]>(supplements);
  const [busy, setBusy] = useState(false);

  const patch = (i: number, p: Partial<Supplement>) =>
    setSups((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const add = () => setSups((prev) => [...prev, { name: "", dose: null, unit: "g" }]);
  const remove = (i: number) => setSups((prev) => prev.filter((_, j) => j !== i));

  const save = async () => {
    setBusy(true);
    const res = await setNutritionGoalsAction({
      calorieGoal: cal.trim() ? Number(cal) : null,
      proteinGoal: pro.trim() ? Number(pro) : null,
      supplements: sups.filter((s) => s.name.trim()),
    });
    setBusy(false);
    if (res.ok) {
      toast("Goals saved");
      router.refresh();
    } else toast(res.error ?? "Could not save");
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="text-muted text-xs">Daily calorie goal</span>
          <input
            value={cal}
            onChange={(e) => setCal(e.target.value)}
            placeholder="e.g. 2500"
            inputMode="decimal"
            className="input mt-1"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted text-xs">Daily protein goal (g)</span>
          <input
            value={pro}
            onChange={(e) => setPro(e.target.value)}
            placeholder="e.g. 180"
            inputMode="decimal"
            className="input mt-1"
          />
        </label>
      </div>

      <div>
        <div className="label">Supplements & daily dose</div>
        <div className="space-y-2">
          {sups.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={s.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                placeholder="Creatine"
                className="input flex-1 !py-2"
                aria-label="Supplement name"
              />
              <input
                value={s.dose ?? ""}
                onChange={(e) =>
                  patch(i, { dose: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="5"
                inputMode="decimal"
                className="input w-16 !py-2 text-center"
                aria-label="Dose amount"
              />
              <input
                value={s.unit}
                onChange={(e) => patch(i, { unit: e.target.value })}
                placeholder="g"
                className="input w-14 !py-2 text-center"
                aria-label="Dose unit"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove supplement"
                className="grid place-items-center w-9 h-9 shrink-0 rounded-lg text-muted hover:text-danger hover:bg-surface-2 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={add}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/15 transition-colors"
        >
          <Plus size={14} /> Add supplement
        </button>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="btn-primary w-full disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save goals"}
      </button>
    </div>
  );
}
