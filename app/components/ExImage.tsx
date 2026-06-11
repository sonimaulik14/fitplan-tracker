"use client";

import { useState } from "react";

/**
 * Shows a real photo if present (e.g. /kris/legs.jpg) and silently falls back
 * to the branded placeholder (e.g. /kris/legs.svg) if it 404s — so dropping a
 * photo into /public/kris just works, with no broken images in the meantime.
 */
export default function ExImage({
  srcKey,
  alt,
  className = "",
  ext = "jpg",
}: {
  srcKey: string;
  alt: string;
  className?: string;
  ext?: "jpg" | "png";
}) {
  const [src, setSrc] = useState(`/kris/${srcKey}.${ext}`);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (!src.endsWith(".svg")) setSrc(`/kris/${srcKey}.svg`);
      }}
      className={className}
    />
  );
}
