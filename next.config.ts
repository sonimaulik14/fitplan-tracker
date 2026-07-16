import type { NextConfig } from "next";

// Static Content-Security-Policy (no per-request nonce — that caused a
// browser-nonce-stripping hydration mismatch). 'unsafe-inline' is allowed for
// scripts/styles since the app never renders untrusted HTML; everything else is
// locked to 'self'. Dev needs 'unsafe-eval' + ws: for Fast Refresh/HMR.
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Build stamp for the service-worker registration URL (lib/sw-client.ts) so
  // each deploy rolls the SW + its caches without hand-bumping a version.
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
      `dev-${Date.now().toString(36)}`,
  },
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
      // Vercel Blob — user avatars and progress photos (lib/storage.ts).
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // Security hardening headers on every response (clickjacking, MIME sniffing,
  // referrer leakage, feature access, and HTTPS pinning).
  async headers() {
    return [
      {
        // The SW script itself must never be HTTP-cached — a stale worker
        // pins users to a dead build's assets.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
