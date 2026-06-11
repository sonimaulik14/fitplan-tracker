import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitPlan — 12-Week Transformation",
    short_name: "FitPlan",
    description:
      "Follow your 12-week training plan, log every set, and track your adherence.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07080c",
    theme_color: "#07080c",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
