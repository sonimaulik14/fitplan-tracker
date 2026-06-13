import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Toaster from "./components/Toaster";
import PWA from "./components/PWA";
import AmbientPhoto from "./components/AmbientPhoto";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FitPlan — 12-Week Transformation Tracker",
    template: "%s · FitPlan",
  },
  description:
    "Follow your 12-week training plan, log every set, and track how closely you stick to it.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "FitPlan" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#07080c",
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
      className={`${inter.variable} ${spaceGrotesk.variable} h-full`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme')||'dark';if(t==='system'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}d.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`,
          }}
        />
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
