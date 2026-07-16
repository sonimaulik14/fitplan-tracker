import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Toaster from "./components/Toaster";
import PWA from "./components/PWA";
import OfflineSync from "./components/OfflineSync";
import AmbientPhoto from "./components/AmbientPhoto";

// FORGE type system: an industrial grotesque superfamily for UI + a condensed
// display cut for headings/hero numbers, and a mono face for anything that
// ticks or aligns in columns (timers, set rows, stat tables).
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
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
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07080c" },
    { media: "(prefers-color-scheme: light)", color: "#eef1f7" },
  ],
  // Extend under the iOS status bar / home indicator so we can pad around them
  // with env(safe-area-inset-*). Without this, those insets always report 0.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowCondensed.variable} ${plexMono.variable} h-full`}
    >
      <head>
        {/* Anti-flash theme init — runs before paint. */}
        <Script id="theme-init" strategy="beforeInteractive">
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
        <OfflineSync />
      </body>
    </html>
  );
}
