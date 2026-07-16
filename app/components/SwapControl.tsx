"use client";

import { useState } from "react";
import { X, Check, ArrowLeftRight, Search } from "lucide-react";
import {
  EQUIPMENT,
  alternativesFor,
  crossfitMovements,
  type Equipment,
} from "@/lib/alternatives";
import Sheet from "./Sheet";

type Mode = "muscle" | "crossfit";

const EQUIP_STORE = "vajra-equipment";
const EQUIP_STORE_LEGACY = "fitplan-equipment"; // pre-rename key; read-only fallback

// Equipment the user has, persisted across sessions. Empty set = "haven't said".
function useEquipment(): [Set<Equipment>, (next: Set<Equipment>) => void] {
  const [have, setHave] = useState<Set<Equipment>>(new Set());
  // Lazy-init from localStorage on first render (client component).
  useState(() => {
    try {
      const raw =
        typeof window !== "undefined" &&
        (localStorage.getItem(EQUIP_STORE) ??
          localStorage.getItem(EQUIP_STORE_LEGACY));
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
  open: openProp,
  onOpenChange,
}: {
  current: string;
  original: string;
  muscle: string;
  onSwap: (name: string) => void;
  // Optional controlled open state (e.g. opened by a swipe gesture). Falls back
  // to internal state when omitted.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = (o: boolean) => (onOpenChange ?? setOpenInternal)(o);
  // The pending selection — nothing is applied until Save. `selected` is a
  // chosen alternative; `custom` is free text. Whichever is set wins on Save.
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [mode, setMode] = useState<Mode>("muscle");
  const [query, setQuery] = useState("");
  const [have, setHave] = useEquipment();

  const close = () => {
    setOpen(false);
    setSelected(null);
    setCustom("");
    setQuery("");
    setMode("muscle");
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

  const q = query.trim().toLowerCase();
  const muscleOptions = alternativesFor(muscle, current, have).filter(
    (a) => !q || a.name.toLowerCase().includes(q)
  );
  const crossfitOptions = crossfitMovements(current, query);
  const options = mode === "muscle" ? muscleOptions : crossfitOptions;

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
            ? "border-success/50 bg-success/10 text-success"
            : "border-border bg-surface-2 text-muted hover:text-success hover:border-success/40"
        }`}
      >
        <ArrowLeftRight size={13} />
        Swap
      </button>

      <Sheet
        open={open}
        onClose={close}
        ariaLabel={`Swap ${current}`}
        panelClassName="flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-border-strong bg-surface-solid shadow-2xl sm:max-w-md sm:rounded-xl"
      >
        {/* mobile grab handle */}
        <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border-strong" />

        {/* header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <ArrowLeftRight size={17} className="text-success shrink-0" />
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

        {/* one-tap revert when currently swapped (original is often not in the
            alternatives list, so this is the reliable way back) */}
        {current.toLowerCase() !== original.toLowerCase() && (
          <div className="px-5 pb-3">
            <button
              type="button"
              onClick={() => {
                onSwap(original);
                close();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-success/40 bg-success/10 px-3.5 py-3 text-left transition-colors hover:bg-success/15"
            >
              <ArrowLeftRight size={16} className="text-success shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs text-muted">Back to original</span>
                <span className="block text-sm font-semibold truncate">
                  {original}
                </span>
              </span>
            </button>
          </div>
        )}

        {/* source tabs: muscle-matched vs CrossFit */}
        <div className="px-5 pb-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-2 p-1">
            {(["muscle", "crossfit"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setSelected(null);
                }}
                aria-pressed={mode === m}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === m
                    ? "bg-surface-solid text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {m === "muscle" ? `For ${muscle}` : "CrossFit"}
              </button>
            ))}
          </div>

          {/* search */}
          <div className="relative mt-3">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              className="input w-full !pl-9"
              value={query}
              placeholder={
                mode === "crossfit"
                  ? "Search CrossFit movements…"
                  : "Search alternatives…"
              }
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* equipment filter (muscle mode only, persists) */}
          {mode === "muscle" && (
            <div className="mt-3">
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
            </div>
          )}

          <p className="text-[11px] text-muted mt-2">
            {options.length} option{options.length === 1 ? "" : "s"}
            {mode === "muscle" && have.size > 0 ? " you can do right now." : "."}
          </p>
        </div>

        {/* alternatives — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 border-t border-border pt-3">
          {options.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">
              No matches.
              <br />
              Try a different search{mode === "muscle" ? " or gear" : ""}, or type
              your own below.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {options.map((o) => {
                const isSel = !custom.trim() && selected === o.name;
                const tag = "equipment" in o ? o.equipment : o.category;
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
                      {tag}
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
          <button
            type="button"
            className="btn-primary w-full"
            onClick={save}
            disabled={!canSave}
          >
            {canSave ? `Save — ${chosen}` : "Select an exercise"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
