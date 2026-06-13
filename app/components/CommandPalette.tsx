"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Item = { label: string; sub?: string; href: string; icon: string };
type Index = {
  exercises: { name: string; muscle: string }[];
  days: { id: string; focus: string; week: number; day: number }[];
  weeks: { number: number; style: string | null }[];
};

const NAV: Item[] = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Plan", href: "/plan", icon: "📋" },
  { label: "This week's targets", href: "/targets", icon: "🎯" },
  { label: "Exercise library", href: "/library", icon: "📚" },
  { label: "Progress", href: "/progress", icon: "🔥" },
  { label: "Measurements & goals", href: "/measurements", icon: "📐" },
  { label: "Nutrition", href: "/nutrition", icon: "🍎" },
  { label: "Workout history", href: "/history", icon: "🗓️" },
  { label: "Personal records", href: "/records", icon: "🏅" },
  { label: "Achievements", href: "/achievements", icon: "🎖️" },
  { label: "12-Week Wrapped", href: "/wrapped", icon: "🎬" },
  { label: "Analysis", href: "/analysis", icon: "📊" },
  { label: "Account", href: "/account", icon: "👤" },
  { label: "Training preferences", href: "/onboarding", icon: "⚙️" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<Index | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const openEvt = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("fitplan:command", openEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("fitplan:command", openEvt);
    };
  }, []);

  useEffect(() => {
    if (open && !index) {
      fetch("/api/search")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setIndex(d))
        .catch(() => {});
    }
    if (open) {
      // reset palette state when it opens (intentional)
      /* eslint-disable react-hooks/set-state-in-effect */
      setQ("");
      setActive(0);
      /* eslint-enable react-hooks/set-state-in-effect */
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open, index]);

  const results = useMemo<Item[]>(() => {
    const items: Item[] = [...NAV];
    if (index) {
      for (const w of index.weeks)
        items.push({
          label: `Week ${w.number}${w.style ? ` : ${w.style}` : ""}`,
          sub: "Jump to week",
          href: `/dashboard?week=${w.number}`,
          icon: "🗓️",
        });
      for (const d of index.days)
        items.push({
          label: `Day ${d.day} — ${d.focus}`,
          sub: `Week ${d.week}`,
          href: `/workout/${d.id}`,
          icon: "🏋️",
        });
      for (const ex of index.exercises)
        items.push({
          label: ex.name,
          sub: `${ex.muscle} · history`,
          href: `/exercise/${encodeURIComponent(ex.name)}`,
          icon: "📈",
        });
    }
    const term = q.trim().toLowerCase();
    if (!term) return items.slice(0, 8);
    return items
      .filter(
        (i) =>
          i.label.toLowerCase().includes(term) ||
          i.sub?.toLowerCase().includes(term)
      )
      .slice(0, 30);
  }, [q, index]);

  useEffect(() => {
    // keep the active row in range as results shrink
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active >= results.length) setActive(0);
  }, [results, active]);

  const go = (item?: Item) => {
    const target = item ?? results[active];
    if (!target) return;
    setOpen(false);
    router.push(target.href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:pt-24">
      <button
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg card overflow-hidden shadow-2xl animate-scale-in">
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <span className="text-muted">🔎</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go();
              }
            }}
            placeholder="Search pages, weeks, exercises…"
            className="flex-1 bg-transparent py-3.5 outline-none text-foreground placeholder:text-muted"
          />
          <kbd className="text-[10px] text-muted border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-auto p-1.5">
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted">
              No matches
            </div>
          )}
          {results.map((item, i) => (
            <button
              key={item.href + item.label}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                i === active ? "bg-accent/10" : "hover:bg-surface-2"
              }`}
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">
                  {item.label}
                </span>
                {item.sub && (
                  <span className="block text-xs text-muted truncate">
                    {item.sub}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
