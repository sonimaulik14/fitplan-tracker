import { ImageResponse } from "next/og";

export const alt = "Vajra — 12-Week Transformation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social share image used when any Vajra link is shared.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "radial-gradient(110% 110% at 100% 0%, rgba(47,107,255,0.16), #07080c 55%)",
          color: "#f4f6fb",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#2f6bff",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 3.5h10L20.8 9 12 21 3.2 9z" fill="#ffffff" />
              <path d="M3.2 9h17.6M7 3.5 9.6 9 12 21 14.4 9 17 3.5" stroke="#0a0c12" strokeOpacity="0.22" strokeWidth="1.1" strokeLinejoin="round" />
            </svg>
          </div>
          Vajra
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.05,
            marginTop: 40,
            letterSpacing: "-0.03em",
            maxWidth: 900,
          }}
        >
          <span>Train the plan.</span>
          <span style={{ color: "#5c8dff" }}>Track the proof.</span>
        </div>
        <div style={{ fontSize: 34, color: "#a8b1c2", marginTop: 36 }}>
          A 12-week transformation tracker — sets, PRs, streaks & volume.
        </div>
      </div>
    ),
    { ...size }
  );
}
