// Unsplash attribution (required by their API guidelines). Renders nothing for
// local fallback photos.
export default function PhotoCredit({
  author,
  authorUrl,
}: {
  author: string | null;
  authorUrl: string | null;
}) {
  if (!author) return null;
  return (
    <a
      href={authorUrl ?? "https://unsplash.com"}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute bottom-2 right-3 z-20 text-[10px] text-white/55 hover:text-white/90 transition-colors"
    >
      Photo: {author}
    </a>
  );
}
