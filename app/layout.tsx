import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import Toaster from "./components/Toaster";
import PWA from "./components/PWA";
import AmbientPhoto from "./components/AmbientPhoto";

// One family, doing all the work via weight + tracking. No display face.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://fitplan-tracker-seven.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Vajra — 12-Week Transformation Tracker",
    template: "%s · Vajra",
  },
  description:
    "Follow your 12-week training plan, log every set, and track how closely you stick to it.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Vajra" },
  openGraph: {
    type: "website",
    siteName: "Vajra",
    title: "Vajra — 12-Week Transformation Tracker",
    description:
      "Follow your 12-week training plan, log every set, and track your progress.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Vajra — 12-Week Transformation Tracker",
    description:
      "Follow your 12-week training plan, log every set, and track your progress.",
  },
};

export const viewport: Viewport = {
  themeColor: "#07080c",
  // Extend under the iOS status bar / home indicator so we can pad around them
  // with env(safe-area-inset-*). Without this, those insets always report 0.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full`}
    >
      <head>
        {/* Anti-flash theme init — runs before paint. Carries the CSP nonce so
            it's allowed under the strict policy. */}
        <Script id="theme-init" strategy="beforeInteractive" nonce={nonce}>
          {`(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme')||'dark';if(t==='system'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}d.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <AmbientPhoto />
        <div className="aurora" aria-hidden>
          <div className="aurora-blob" />
        </div>
        {children}
        <Toaster />
        <PWA />
      </body>
    </html>
  );
}
