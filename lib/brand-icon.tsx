import { ImageResponse } from "next/og";

// Single source of truth for every generated app icon (favicon, apple touch,
// PWA install + maskable). A white faceted-diamond Vajra mark on the accent
// tile. `pad` is the share of the canvas kept as safe-zone padding — higher
// for maskable icons so the circular mask never clips the mark.
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
          <path d="M7 3.5h10L20.8 9 12 21 3.2 9z" fill="#ffffff" />
          <path
            d="M3.2 9h17.6M7 3.5 9.6 9 12 21 14.4 9 17 3.5"
            stroke="#0a0c12"
            strokeOpacity="0.22"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: px, height: px }
  );
}
