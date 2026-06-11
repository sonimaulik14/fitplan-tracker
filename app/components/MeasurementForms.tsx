"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logMeasurementsAction, setGoalWeightAction } from "@/lib/actions";
import {
  lengthUnit,
  lenToCm,
  unitToKg,
  type Unit,
} from "@/lib/ui";
import { toast } from "@/lib/toast";

const FIELDS: { key: string; label: string; len: boolean }[] = [
  { key: "chestCm", label: "Chest", len: true },
  { key: "waistCm", label: "Waist", len: true },
  { key: "hipsCm", label: "Hips", len: true },
  { key: "armsCm", label: "Arms", len: true },
  { key: "thighsCm", label: "Thighs", len: true },
  { key: "bodyFat", label: "Body fat %", len: false },
];

export function MeasurementForm({ unit }: { unit: Unit }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const lu = lengthUnit(unit);

  const submit = async () => {
    setBusy(true);
    const num = (k: string) => {
      const raw = vals[k]?.trim();
      if (!raw) return null;
      const n = Number(raw);
      if (Number.isNaN(n)) return null;
      return n;
    };
    const payload = {
      chestCm: num("chestCm") != null ? lenToCm(num("chestCm")!, unit) : null,
      waistCm: num("waistCm") != null ? lenToCm(num("waistCm")!, unit) : null,
      hipsCm: num("hipsCm") != null ? lenToCm(num("hipsCm")!, unit) : null,
      armsCm: num("armsCm") != null ? lenToCm(num("armsCm")!, unit) : null,
      thighsCm: num("thighsCm") != null ? lenToCm(num("thighsCm")!, unit) : null,
      bodyFat: num("bodyFat"),
    };
    const res = await logMeasurementsAction(payload);
    setBusy(false);
    if (res.ok) {
      toast("Measurements saved ✓");
      setVals({});
      router.refresh();
    } else {
      toast(res.error ?? "Could not save");
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {FIELDS.map((f) => (
        <label key={f.key} className="text-sm">
          <span className="text-muted text-xs">
            {f.label} {f.len ? `(${lu})` : "(%)"}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={vals[f.key] ?? ""}
            onChange={(e) =>
              setVals((v) => ({ ...v, [f.key]: e.target.value }))
            }
            placeholder="—"
            className="input mt-1"
          />
        </label>
      ))}
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="btn-primary col-span-2 sm:col-span-3 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save measurements"}
      </button>
    </div>
  );
}

export function GoalWeightForm({
  unit,
  current,
}: {
  unit: Unit;
  current: number | null; // in user's unit, already converted
}) {
  const router = useRouter();
  const [val, setVal] = useState(current != null ? String(current) : "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const n = val.trim() ? Number(val) : null;
    const kg = n == null || Number.isNaN(n) ? null : unitToKg(n, unit);
    const res = await setGoalWeightAction(kg);
    setBusy(false);
    if (res.ok) {
      toast("Goal updated ✓");
      router.refresh();
    } else toast(res.error ?? "Could not save");
  };

  return (
    <div className="flex items-end gap-2">
      <label className="text-sm flex-1">
        <span className="text-muted text-xs">Goal weight ({unit})</span>
        <input
          type="text"
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="e.g. 80"
          className="input mt-1"
        />
      </label>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="btn-primary disabled:opacity-60"
      >
        {busy ? "…" : "Set"}
      </button>
    </div>
  );
}
