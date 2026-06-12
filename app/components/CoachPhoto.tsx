"use client";

import Image from "next/image";
import { useState } from "react";

// Login/auth hero photo of the coach (Kris Gethin). Drop the real photo at
// /public/kris/coach.jpg and it shows automatically; until then it falls back
// to the hero gym shot so the page never has a broken image.
export default function CoachPhoto({ className = "" }: { className?: string }) {
  const [src, setSrc] = useState("/kris/coach.jpg");
  return (
    <Image
      src={src}
      alt="Your coach"
      fill
      priority
      sizes="(max-width: 1024px) 100vw, 50vw"
      className={className}
      onError={() => {
        if (src !== "/kris/hero.jpg") setSrc("/kris/hero.jpg");
      }}
    />
  );
}
