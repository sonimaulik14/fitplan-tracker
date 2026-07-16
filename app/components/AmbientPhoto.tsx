import { getPhoto } from "@/lib/unsplash";

// Fixed, heavily-darkened photographic backdrop behind everything — gives the
// app real depth instead of a flat gradient. Resolves once (cached), falls back
// to a local photo when Unsplash isn't configured.
export default async function AmbientPhoto() {
  const photo = await getPhoto("bg");
  return (
    <div
      className="ambient-photo"
      aria-hidden
      style={{ backgroundImage: `url(${photo.url})` }}
    />
  );
}
