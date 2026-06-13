import { ImageResponse } from "next/og";

// Single source of truth for every generated app icon (favicon, apple touch,
// PWA install + maskable). A white gada (Hanuman's mace) on the accent tile.
// `pad` is the share of the canvas kept as safe-zone padding — higher for
// maskable icons so the circular mask never clips the mark.
export function vajraIcon(px: number, opts?: { pad?: number; radius?: number }) {
  const pad = opts?.pad ?? 0.18;
  const mark = Math.round(px * (1 - pad * 2));
  const radius = opts?.radius ?? Math.round(px * 0.22);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2f6bff",
          borderRadius: radius,
        }}
      >
        <svg
          width={mark}
          height={mark}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="8.7" y="2.6" width="6.6" height="3" rx="1.5" fill="#ffffff" />
          <rect x="10.7" y="5.2" width="2.6" height="7.2" rx="1.3" fill="#ffffff" />
          <circle cx="12" cy="16.4" r="5.1" fill="#ffffff" />
          <circle cx="12" cy="22" r="1.4" fill="#ffffff" />
        </svg>
      </div>
    ),
    { width: px, height: px }
  );
}
