import Image from "next/image";
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
      <Image
        src={photo.url}
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 768px"
        className="object-cover duotone kenburns"
      />
      <div className="absolute inset-0 z-10 p-6 sm:p-7 flex flex-col justify-end">
        {eyebrow && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 mb-2.5 drop-shadow">
            {eyebrow}
          </span>
        )}
        <h1 className="display-hero text-4xl sm:text-5xl text-white drop-shadow-lg">
          {title}
        </h1>
        {subtitle && (
          <p className="text-white/85 text-sm mt-2.5 max-w-xl leading-relaxed drop-shadow">
            {subtitle}
          </p>
        )}
      </div>
      <PhotoCredit author={photo.author} authorUrl={photo.authorUrl} />
    </div>
  );
}
