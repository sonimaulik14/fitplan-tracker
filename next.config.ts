import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Tree-shake large icon / animation packages so only used exports ship.
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
  // Optimize images: modern formats + allow the remote photo CDNs.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
};

export default nextConfig;
