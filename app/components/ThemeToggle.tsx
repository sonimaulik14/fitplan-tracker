"use client";

import { useEffect, useState } from "react";

type Pref = "light" | "dark" | "system";

function resolve(pref: Pref): "light" | "dark" {
  if (pref === "system")
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  return pref;
}

export default function ThemeToggle() {
  const [pref, setPref] = useState<Pref>("dark");

  useEffect(() => {
    try {
      setPref((localStorage.getItem("theme") as Pref) || "dark");
    } catch {}
  }, []);

  const choose = (p: Pref) => {
    setPref(p);
    try {
      localStorage.setItem("theme", p);
    } catch {}
    document.documentElement.dataset.theme = resolve(p);
  };

  const opts: { key: Pref; label: string }[] = [
    { key: "light", label: "☀" },
    { key: "dark", label: "☾" },
    { key: "system", label: "⌂" },
  ];

  return (
    <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5 text-sm">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => choose(o.key)}
          aria-label={`${o.key} theme`}
          title={`${o.key[0].toUpperCase()}${o.key.slice(1)} theme`}
          className={`w-7 h-7 grid place-items-center rounded-md transition-colors ${
            pref === o.key
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
