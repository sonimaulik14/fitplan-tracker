"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import ExImage from "./ExImage";
import { muscleStyle } from "@/lib/ui";

type Status = "loading" | "gif" | "none";

function youTube(name: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    "how to " + name + " proper form"
  )}`;
}

/** Large demo block for the exercise detail page. */
export function ExerciseDemoHero({
  name,
  muscle,
}: {
  name: string;
  muscle: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [gif, setGif] = useState<string | null>(null);
  const st = muscleStyle(muscle);

  useEffect(() => {
    let on = true;
    fetch(`/api/exercise-demo?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!on) return;
        if (d.found && d.gifUrl) {
          setGif(d.gifUrl);
          setStatus("gif");
        } else setStatus("none");
      })
      .catch(() => on && setStatus("none"));
    return () => {
      on = false;
    };
  }, [name]);

  if (status === "gif" && gif) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border bg-white animate-fade-up">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gif}
          alt={`${name} demonstration`}
          className="w-full h-64 sm:h-72 object-contain"
        />
        <a
          href={youTube(name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm font-semibold py-2.5 text-accent bg-surface-2 hover:bg-surface-2/70 transition-colors"
        >
          <Play size={14} fill="currentColor" /> Watch full demo on YouTube
        </a>
      </div>
    );
  }

  // Loading or no GIF → muscle visual + watch button (still motivational).
  return (
    <div className="relative overflow-hidden rounded-2xl img-overlay group h-52 sm:h-60 animate-fade-up">
      <ExImage
        srcKey={st.key}
        alt={muscle}
        className="absolute inset-0 w-full h-full object-cover duotone transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 z-10 p-5 flex flex-col justify-end">
        <a
          href={youTube(name)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-fit !px-4"
        >
          <Play size={16} fill="currentColor" /> Watch form demo
        </a>
        <p className="text-white/70 text-xs mt-2">
          {status === "loading"
            ? "Looking for a demo clip…"
            : "Opens a video walkthrough on YouTube."}
        </p>
      </div>
    </div>
  );
}

/** Compact, on-demand demo toggle for the workout logger. */
export function ExerciseDemoInline({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | "idle">("idle");
  const [gif, setGif] = useState<string | null>(null);
  const fetched = useRef(false);

  const load = () => {
    if (fetched.current) return;
    fetched.current = true;
    setStatus("loading");
    fetch(`/api/exercise-demo?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.found && d.gifUrl) {
          setGif(d.gifUrl);
          setStatus("gif");
        } else {
          setStatus("none");
          window.open(youTube(name), "_blank", "noopener");
        }
      })
      .catch(() => setStatus("none"));
  };

  const onClick = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="chip !py-0.5 text-accent border-accent/30 bg-accent/10 hover:bg-accent/20 transition-colors"
      >
        <Play size={11} fill="currentColor" /> Demo
      </button>
      {open && status === "gif" && gif && (
        <div className="mt-2 w-full rounded-xl overflow-hidden border border-border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gif}
            alt={`${name} demonstration`}
            className="w-full max-h-56 object-contain"
          />
        </div>
      )}
      {open && status === "loading" && (
        <div className="mt-2 w-full h-32 rounded-xl skeleton" />
      )}
    </>
  );
}
