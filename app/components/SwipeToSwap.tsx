"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight } from "lucide-react";

const THRESHOLD = 70; // px of left-swipe needed to trigger
const MAX = 110; // clamp drag distance

// Wraps an exercise card so a left-swipe (touch) reveals and triggers "Swap".
// Vertical gestures are ignored so the page still scrolls normally.
export default function SwipeToSwap({
  enabled = true,
  onSwipe,
  children,
}: {
  enabled?: boolean;
  onSwipe: () => void;
  children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<null | "h" | "v">(null);

  if (!enabled) return <>{children}</>;

  const onStart = (x: number, y: number) => {
    start.current = { x, y };
    axis.current = null;
    setAnimating(false);
  };

  const onMove = (x: number, y: number) => {
    if (!start.current) return;
    const ddx = x - start.current.x;
    const ddy = y - start.current.y;
    if (axis.current === null) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
      axis.current = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
    }
    if (axis.current === "v") return; // let the page scroll
    // only react to leftward drag
    setDx(Math.max(-MAX, Math.min(0, ddx)));
  };

  const onEnd = () => {
    const triggered = dx <= -THRESHOLD;
    setAnimating(true);
    setDx(0);
    start.current = null;
    axis.current = null;
    if (triggered) onSwipe();
  };

  const reveal = Math.min(1, -dx / THRESHOLD);

  return (
    <div className="relative">
      {/* action revealed behind the card as you swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-6 text-success pointer-events-none select-none"
        style={{ opacity: reveal }}
        aria-hidden
      >
        <ArrowLeftRight size={16} />
        <span className="text-sm font-semibold">Swap</span>
      </div>

      <div
        onTouchStart={(e) =>
          onStart(e.touches[0].clientX, e.touches[0].clientY)
        }
        onTouchMove={(e) => onMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onEnd}
        style={{
          transform: `translateX(${dx}px)`,
          transition: animating ? "transform 0.2s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
