"use client";

import { useState } from "react";
import { X, Check, ArrowLeftRight } from "lucide-react";
import { EQUIPMENT, alternativesFor, type Equipment } from "@/lib/alternatives";
import Sheet from "./Sheet";

const EQUIP_STORE = "fitplan-equipment";

// Equipment the user has, persisted across sessions. Empty set = "haven't said".
function useEquipment(): [Set<Equipment>, (next: Set<Equipment>) => void] {
  const [have, setHave] = useState<Set<Equipment>>(new Set());
  // Lazy-init from localStorage on first render (client component).
  useState(() => {
    try {
      const raw =
        typeof window !== "undefined" && localStorage.getItem(EQUIP_STORE);
      if (raw) setHave(new Set(JSON.parse(raw) as Equipment[]));
    } catch {
      /* ignore */
    }
  });
  const update = (next: Set<Equipment>) => {
    setHave(next);
    try {
      localStorage.setItem(EQUIP_STORE, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };
  return [have, update];
}

export default function SwapControl({
  current,
  original,
  muscle,
  onSwap,
}: {
  current: string;
  original: string;
  muscle: string;
  onSwap: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // The pending selection — nothing is applied until Save. `selected` is a
  // chosen alternative; `custom` is free text. Whichever is set wins on Save.
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [have, setHave] = useEquipment();

  const close = () => {
    setOpen(false);
    setSelected(null);
    setCustom("");
  };

  const chosen = (custom.trim() || selected || "").trim();
  const canSave =
    chosen.length > 0 && chosen.toLowerCase() !== current.toLowerCase();

  const save = () => {
    if (!canSave) return;
    onSwap(chosen);
    close();
  };

  const toggleEquip = (id: Equipment) => {
    const next = new Set(have);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHave(next);
  };

  const options = alternativesFor(muscle, current, have);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelected(null);
          setCustom("");
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
          open
            ? "border-accent-2/50 bg-accent-2/10 text-accent-2"
            : "border-border bg-surface-2 text-muted hover:text-accent-2 hover:border-accent-2/40"
        }`}
      >
        <ArrowLeftRight size={13} />
        Swap
      </button>

      <Sheet
        open={open}
        onClose={close}
        ariaLabel={`Swap ${current}`}
        panelClassName="flex max-h-[88vh] w-full flex-col rounded-t-3xl border border-border-strong bg-surface-solid shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        {/* mobile grab handle */}
        <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border-strong" />

        {/* header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <ArrowLeftRight size={17} className="text-accent-2 shrink-0" />
              Swap exercise
            </h2>
            <p className="text-xs text-muted mt-0.5 truncate">
              Replacing <span className="text-foreground">{current}</span> ·{" "}
              {muscle}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="grid place-items-center w-8 h-8 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* equipment filter (persists) */}
        <div className="px-5 pb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-2">
            Equipment you have
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT.map((e) => {
              const on = have.has(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleEquip(e.id)}
                  aria-pressed={on}
                  className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                    on
                      ? "border-accent/50 bg-accent/15 text-accent font-semibold"
                      : "border-border bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {e.icon} {e.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted mt-2">
            {have.size === 0
              ? "Showing all — tap the gear you have to narrow it down."
              : `${options.length} option${options.length === 1 ? "" : "s"} you can do right now.`}
          </p>
        </div>

        {/* alternatives — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 border-t border-border pt-3">
          {options.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">
              No matches for that equipment.
              <br />
              Pick more gear above, or type your own below.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {options.map((o) => {
                const isSel = !custom.trim() && selected === o.name;
                return (
                  <button
                    key={o.name}
                    type="button"
                    aria-pressed={isSel}
                    onClick={() => {
                      setSelected(o.name);
                      setCustom("");
                    }}
                    className={`group flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left active:scale-[0.98] transition-all ${
                      isSel
                        ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                        : "border-border bg-surface-2 hover:border-accent/50 hover:bg-accent/5"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isSel && <Check size={15} className="text-accent shrink-0" />}
                      <span className="text-sm font-medium truncate">{o.name}</span>
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wide shrink-0 ${
                        isSel ? "text-accent" : "text-muted group-hover:text-accent"
                      }`}
                    >
                      {o.equipment}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* footer: custom + save */}
        <div className="px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-border bg-surface-solid rounded-b-2xl">
          <input
            className="input w-full mb-2.5"
            value={custom}
            placeholder="Or type a custom exercise…"
            onChange={(e) => {
              setCustom(e.target.value);
              if (e.target.value.trim()) setSelected(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={save}
              disabled={!canSave}
            >
              {canSave ? `Save — ${chosen}` : "Select an exercise"}
            </button>
            {current !== original && (
              <button
                type="button"
                className="btn-ghost shrink-0"
                onClick={() => {
                  onSwap(original);
                  close();
                }}
              >
                ↺ Reset
              </button>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}
