import { ImageResponse } from "next/og";

// Generated favicon — solid accent tile + white "F", matching the in-app brand.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          color: "#fff",
          fontSize: 24,
          fontWeight: 800,
          borderRadius: 7,
        }}
      >
        F
      </div>
    ),
    { ...size }
  );
}
