import { getPhoto } from "@/lib/unsplash";

// Server component that resolves a live photo (Pexels/Unsplash, cached) for a
// muscle/focus key and renders it like ExImage. Falls back to the local photo.
export default async function MusclePhoto({
  srcKey,
  alt = "",
  className = "",
}: {
  srcKey: string; // e.g. "legs", "chest", "rest", "hero"
  alt?: string;
  className?: string;
}) {
  const photo = await getPhoto(`hero:${srcKey}`);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.url} alt={alt} loading="lazy" className={className} />
  );
}
