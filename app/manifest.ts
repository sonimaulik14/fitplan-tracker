import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vajra — 12-Week Transformation",
    short_name: "Vajra",
    description:
      "Follow your 12-week training plan, log every set, and track your adherence.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07080c",
    theme_color: "#07080c",
    orientation: "portrait",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
