import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type Photo = {
  url: string;
  author: string | null;
  authorUrl: string | null;
  credited: boolean; // true when sourced from Unsplash (needs attribution)
};

// Local fallbacks (always present in /public/kris) keyed by slot. Page slots map
// to varied local photos so banners differ even without an Unsplash key.
const PAGE_FALLBACK: Record<string, string> = {
  "page:analysis": "back",
  "page:progress": "cardio",
  "page:plan": "legs",
  "page:account": "shoulders",
  "page:nutrition": "arms",
  "page:measurements": "abs",
  "page:records": "chest",
  "page:history": "calves",
  "page:achievements": "hero",
  "page:leaderboard": "cardio",
  "page:library": "arms",
};
function fallbackKey(queryKey: string): string {
  if (queryKey.startsWith("hero:")) return queryKey.slice(5);
  if (queryKey.startsWith("muscle:")) return queryKey.slice(7);
  return PAGE_FALLBACK[queryKey] ?? "hero";
}

function fallback(queryKey: string): Photo {
  return {
    url: `/kris/${fallbackKey(queryKey)}.jpg`,
    author: null,
    authorUrl: null,
    credited: false,
  };
}

// Curated search queries per slot for an energetic, premium gym aesthetic.
export const PHOTO_QUERIES: Record<string, string> = {
  bg: "dark moody gym interior",
  "page:analysis": "barbell weight plates dark",
  "page:progress": "athlete training silhouette",
  "page:plan": "gym dumbbell rack dark",
  "page:account": "minimal gym locker dark",
  "page:auth": "bodybuilder training dramatic light",
  "page:nutrition": "healthy meal prep protein dark",
  "page:measurements": "tape measure muscle fitness",
  "page:records": "heavy barbell deadlift gym",
  "page:history": "gym training workout dark",
  "page:achievements": "athlete victory strong gym",
  "page:library": "dumbbells gym equipment dark",
  "page:leaderboard": "competition athletes gym",
  "hero:legs": "barbell squat legs gym",
  "hero:chest": "bench press chest workout",
  "hero:back": "pull up back workout gym",
  "hero:shoulders": "shoulder press dumbbell gym",
  "hero:arms": "biceps curl arms gym",
  "hero:calves": "calf raise gym",
  "hero:abs": "abs core workout gym",
  "hero:cardio": "treadmill running gym cardio",
  "hero:rest": "stretching recovery gym",
  "hero:hero": "gym workout training dark",
};

const WEEK = 60 * 60 * 24 * 7;

async function fetchFromUnsplash(query: string): Promise<Photo | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        query
      )}&orientation=landscape&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${key}` },
        next: { revalidate: WEEK },
      }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const url: string | undefined = d?.urls?.regular;
    if (!url) return null;
    return {
      url,
      author: d?.user?.name ?? null,
      authorUrl: d?.user?.links?.html ?? null,
      credited: true,
    };
  } catch {
    return null;
  }
}

// Pexels — instant API key, no review. https://www.pexels.com/api/
async function fetchFromPexels(query: string): Promise<Photo | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query
      )}&per_page=1&orientation=landscape`,
      { headers: { Authorization: key }, next: { revalidate: WEEK } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const photo = d?.photos?.[0];
    const url: string | undefined = photo?.src?.landscape ?? photo?.src?.large;
    if (!url) return null;
    return {
      url,
      author: photo?.photographer ?? null,
      authorUrl: photo?.photographer_url ?? null,
      credited: true,
    };
  } catch {
    return null;
  }
}

// Try whichever provider is configured (Unsplash first, then Pexels).
async function fetchPhoto(query: string): Promise<Photo | null> {
  return (await fetchFromUnsplash(query)) ?? (await fetchFromPexels(query));
}

/**
 * Resolve a photo for a slot key. Order: DB cache → Unsplash (then cache) →
 * local /public/kris fallback. De-duped per request via React cache().
 */
export const getPhoto = cache(async (queryKey: string): Promise<Photo> => {
  const cached = await prisma.photoCache.findUnique({ where: { queryKey } });
  if (cached) {
    return {
      url: cached.url,
      author: cached.author,
      authorUrl: cached.authorUrl,
      credited: true,
    };
  }

  const query = PHOTO_QUERIES[queryKey] ?? queryKey;
  const photo = await fetchPhoto(query);
  if (!photo) return fallback(queryKey);

  try {
    await prisma.photoCache.create({
      data: {
        queryKey,
        url: photo.url,
        author: photo.author,
        authorUrl: photo.authorUrl,
      },
    });
  } catch {
    /* race: another request cached it first — fine */
  }
  return photo;
});
