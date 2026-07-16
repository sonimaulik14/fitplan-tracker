"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { fmtVolume, type Unit } from "@/lib/ui";

export default function ShareCard({
  name,
  planName,
  adherence,
  setAdherence,
  repQuality,
  streak,
  volume,
  prs,
  completedWorkouts,
  unit,
}: {
  name: string;
  planName: string;
  adherence: number;
  setAdherence: number;
  repQuality: number;
  streak: number;
  volume: number;
  prs: number;
  completedWorkouts: number;
  unit: Unit;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const url = await (await import("html-to-image")).toPng(ref.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = "fitplan-progress.png";
      a.click();
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const text = `My ${planName} progress: ${adherence}% adherence, ${completedWorkouts} workouts, ${streak}-day streak. #Vajra`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Vajra progress", text });
      } catch {}
    } else {
      await navigator.clipboard?.writeText(text);
    }
  };

  const stats = [
    { k: "Sets", v: `${setAdherence}%` },
    { k: "Rep quality", v: `${repQuality}%` },
    { k: "Streak", v: `${streak}d` },
    { k: "PRs", v: `${prs}` },
  ];

  return (
    <div>
      {/* The capturable card */}
      <div className="overflow-hidden rounded-xl">
        <div
          ref={ref}
          style={{
            background:
              "radial-gradient(120% 120% at 100% 0%, rgba(47,107,255,0.2), #07080c 58%)",
            padding: "28px",
            color: "#f4f6fb",
            fontFamily: "var(--font-barlow), system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontWeight: 800, letterSpacing: "-0.5px" }}>
              Vajra
            </div>
            <div style={{ fontSize: 12, color: "#a8b1c2" }}>{planName}</div>
          </div>

          <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: "50%",
                background: `conic-gradient(#2f6bff ${adherence * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: "50%",
                  background: "#07080c",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div style={{ fontSize: 30, fontWeight: 800 }}>{adherence}%</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#a8b1c2" }}>{name}</div>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>
                {completedWorkouts} workouts done
              </div>
              <div style={{ fontSize: 13, color: "#a8b1c2", marginTop: 4 }}>
                {fmtVolume(volume, unit)} {unit} total volume lifted
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            {stats.map((s) => (
              <div
                key={s.k}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "12px 8px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: "#f4f6fb" }}>
                  {s.v}
                </div>
                <div style={{ fontSize: 10, color: "#a8b1c2", marginTop: 2 }}>
                  {s.k}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button className="btn-primary !py-2" onClick={download} disabled={busy}>
          {busy ? (
            "Rendering…"
          ) : (
            <>
              <Download size={15} aria-hidden /> Download image
            </>
          )}
        </button>
        <button className="btn-ghost !py-2" onClick={share}>
          Share
        </button>
      </div>
    </div>
  );
}
