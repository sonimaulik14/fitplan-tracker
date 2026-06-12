import { getPhoto } from "@/lib/unsplash";
import PhotoCredit from "./PhotoCredit";

// Full-bleed photographic page header. Resolves a cached Unsplash photo for the
// slot (falls back to a local photo), with a dark scrim and overlaid title.
export default async function PhotoHero({
  queryKey,
  eyebrow,
  title,
  subtitle,
  className = "",
}: {
  queryKey: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const photo = await getPhoto(queryKey);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl img-overlay h-56 sm:h-72 animate-fade-up ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt=""
        className="absolute inset-0 w-full h-full object-cover duotone kenburns"
      />
      <div className="absolute inset-0 z-10 p-6 flex flex-col justify-end">
        {eyebrow && (
          <span className="chip w-fit mb-2 !bg-black/30 !border-white/20 text-white backdrop-blur">
            {eyebrow}
          </span>
        )}
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white drop-shadow-lg">
          {title}
        </h1>
        {subtitle && (
          <p className="text-white/85 text-sm mt-1.5 max-w-xl drop-shadow">
            {subtitle}
          </p>
        )}
      </div>
      <PhotoCredit author={photo.author} authorUrl={photo.authorUrl} />
    </div>
  );
}
