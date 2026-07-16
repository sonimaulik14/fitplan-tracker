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
      // read persisted theme post-mount to avoid an SSR hydration mismatch
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPref((localStorage.getItem("theme") as Pref) || "dark");
    } catch {}
  }, []);

  const choose = (p: Pref) => {
    setPref(p);
    try {
      localStorage.setItem("theme", p);
    } catch {}
    // DOM side-effect in an event handler (not render) — intentional
    // eslint-disable-next-line react-hooks/immutability
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
              ? "bg-accent text-accent-ink"
              : "text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
