"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => void; userChoice: Promise<unknown> };

export default function PWA() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      try {
        if (!localStorage.getItem("pwa-dismissed")) setShow(true);
      } catch {
        setShow(true);
      }
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setShow(false);
    setDeferred(null);
  };

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem("pwa-dismissed", "1");
    } catch {}
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,26rem)] card p-4 shadow-2xl flex items-center gap-3 animate-fade-up">
      <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent-hi to-accent text-white font-black shrink-0">
        F
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">Install FitPlan</div>
        <div className="text-xs text-muted">
          Add to your home screen for quick, app-like access.
        </div>
      </div>
      <button onClick={dismiss} className="btn-ghost !py-1.5 !px-3 text-xs">
        Later
      </button>
      <button onClick={install} className="btn-primary !py-1.5 !px-3 text-xs">
        Install
      </button>
    </div>
  );
}
