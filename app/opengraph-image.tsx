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
            "radial-gradient(110% 110% at 100% 0%, rgba(255,122,31,0.18), #0c0b09 55%)",
          color: "#f2eee6",
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
              background: "#FF7A1F",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8.7" y="2.6" width="6.6" height="3" rx="1.5" fill="#1C0F02" />
              <rect x="10.7" y="5.2" width="2.6" height="7.2" rx="1.3" fill="#1C0F02" />
              <circle cx="12" cy="16.4" r="5.1" fill="#1C0F02" />
              <circle cx="12" cy="22" r="1.4" fill="#1C0F02" />
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
          <span style={{ color: "#FF7A1F" }}>Track the proof.</span>
        </div>
        <div style={{ fontSize: 34, color: "#a69e92", marginTop: 36 }}>
          A 12-week transformation tracker — sets, PRs, streaks & volume.
        </div>
      </div>
    ),
    { ...size }
  );
}
