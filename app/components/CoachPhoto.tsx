"use client";

import { useState } from "react";

// Login/auth hero photo of the coach (Kris Gethin). Drop the real photo at
// /public/kris/coach.jpg and it shows automatically; until then it falls back
// to the hero gym shot so the page never has a broken image.
export default function CoachPhoto({ className = "" }: { className?: string }) {
  const [src, setSrc] = useState("/kris/coach.jpg");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Your coach"
      className={className}
      onError={() => {
        if (src !== "/kris/hero.jpg") setSrc("/kris/hero.jpg");
      }}
    />
  );
}
