import Image from "next/image";
import { getPhoto } from "@/lib/unsplash";

// Server component that resolves a live photo (Pexels/Unsplash, cached) for a
// muscle/focus key and renders it optimized (next/image → AVIF/WebP, sized to
// the slot). Falls back to the local photo.
// - Pass width+height for a fixed-size thumbnail.
// - Omit them for a full-bleed `fill` image (parent must be position:relative).
export default async function MusclePhoto({
  srcKey,
  alt = "",
  className = "",
  sizes = "100vw",
  width,
  height,
}: {
  srcKey: string; // e.g. "legs", "chest", "rest", "hero"
  alt?: string;
  className?: string;
  sizes?: string;
  width?: number;
  height?: number;
}) {
  const photo = await getPhoto(`hero:${srcKey}`);
  if (width && height) {
    return (
      <Image
        src={photo.url}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    );
  }
  return (
    <Image src={photo.url} alt={alt} fill sizes={sizes} className={className} />
  );
}
