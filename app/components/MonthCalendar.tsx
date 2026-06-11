"use client";

import { useState } from "react";

type Cell = { date: string; count: number };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export default function MonthCalendar({
  cells,
  initialYear,
  initialMonth,
  todayKey,
}: {
  cells: Cell[];
  initialYear: number;
  initialMonth: number; // 0-indexed
  todayKey: string;
}) {
  const byDate = new Map(cells.map((c) => [c.date, c.count]));
  const [y, setY] = useState(initialYear);
  const [m, setM] = useState(initialMonth);

  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const pad = (n: number) => String(n).padStart(2, "0");
  const grid: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(`${y}-${pad(m + 1)}-${pad(d)}`);

  const step = (dir: number) => {
    const nm = m + dir;
    if (nm < 0) {
      setM(11);
      setY(y - 1);
    } else if (nm > 11) {
      setM(0);
      setY(y + 1);
    } else setM(nm);
  };

  const monthActive = cells.filter(
    (c) => c.date.startsWith(`${y}-${pad(m + 1)}`) && c.count > 0
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => step(-1)}
          className="w-8 h-8 grid place-items-center rounded-lg border border-border hover:bg-surface-2"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="font-semibold">
            {MONTHS[m]} {y}
          </div>
          <div className="text-xs text-muted">
            {monthActive} active day{monthActive === 1 ? "" : "s"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          className="w-8 h-8 grid place-items-center rounded-lg border border-border hover:bg-surface-2"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {DOW.map((d, i) => (
          <div key={i} className="text-[11px] text-muted font-medium pb-1">
            {d}
          </div>
        ))}
        {grid.map((key, i) => {
          if (!key) return <div key={i} />;
          const count = byDate.get(key) ?? 0;
          const day = Number(key.slice(-2));
          const isToday = key === todayKey;
          return (
            <div
              key={i}
              title={count ? `${count} sets logged` : undefined}
              className={`aspect-square rounded-lg grid place-items-center text-xs transition-colors ${
                count > 0
                  ? "text-white font-semibold"
                  : "text-muted bg-surface-2"
              } ${isToday ? "ring-2 ring-accent" : ""}`}
              style={
                count > 0
                  ? { background: "var(--accent)" }
                  : undefined
              }
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
