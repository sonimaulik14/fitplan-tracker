"use client";

import { useEffect, useState } from "react";
import type { ToastTone } from "@/lib/toast";

type Item = { id: number; message: string; tone: ToastTone };

export default function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let n = 0;
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent).detail as {
        message: string;
        tone: ToastTone;
      };
      const id = ++n;
      setItems((prev) => [...prev, { id, message, tone }]);
      setTimeout(
        () => setItems((prev) => prev.filter((i) => i.id !== id)),
        3200
      );
    };
    window.addEventListener("fitplan:toast", onToast);
    return () => window.removeEventListener("fitplan:toast", onToast);
  }, []);

  const tones: Record<ToastTone, string> = {
    success: "border-accent-2/40 text-accent-2",
    error: "border-red-500/40 text-red-300",
    info: "border-border text-foreground",
  };
  const dot: Record<ToastTone, string> = {
    success: "bg-accent-2",
    error: "bg-red-400",
    info: "bg-accent",
  };

  return (
    <div className="fixed z-[60] bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
      {items.map((i) => (
        <div
          key={i.id}
          style={{ animation: "toastIn 0.25s cubic-bezier(0.22,1,0.36,1)" }}
          className={`pointer-events-auto card border px-4 py-2.5 text-sm font-medium shadow-2xl flex items-center gap-2.5 ${tones[i.tone]}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dot[i.tone]}`} />
          {i.message}
        </div>
      ))}
    </div>
  );
}
