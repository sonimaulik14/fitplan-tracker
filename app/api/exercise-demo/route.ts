import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const HOST = "exercisedb.p.rapidapi.com";

// Reduce a plan exercise name to a likely-matchable query for ExerciseDB.
// e.g. "Triceps Pushdown — Rope Attachment" -> "triceps pushdown"
//      "Leg Press (Single Leg)" -> "leg press"
function cleanName(raw: string): string {
  return raw
    .replace(/\(.*?\)/g, "") // drop parentheticals
    .split(/—|–| - /)[0] // drop after dash qualifiers
    .replace(/[^a-zA-Z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Candidate queries from most to least specific, to improve hit rate.
function candidates(name: string): string[] {
  const c = cleanName(name);
  const words = c.split(" ");
  const out = [c];
  // drop leading equipment qualifier (barbell/dumbbell/cable/machine/smith…)
  const equip = ["barbell", "dumbbell", "cable", "machine", "smith", "leverage", "seated", "standing", "lying", "incline", "decline"];
  if (words.length > 2 && equip.includes(words[0])) out.push(words.slice(1).join(" "));
  // last two words (the movement) as a final fallback
  if (words.length > 2) out.push(words.slice(-2).join(" "));
  return [...new Set(out)].filter(Boolean);
}

async function fetchGif(query: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://${HOST}/exercises/name/${encodeURIComponent(query)}?limit=1&offset=0`,
      {
        headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": HOST },
        // cache at the fetch layer too; our DB cache is the primary one
        next: { revalidate: 60 * 60 * 24 },
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { gifUrl?: string }[];
    return data?.[0]?.gifUrl ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Cap lookups: this proxies a metered third-party API and writes a shared cache.
  if (!(await rateLimit("exercise-demo", 30, 60_000)))
    return NextResponse.json({ found: false }, { status: 429 });

  const name = new URL(req.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ found: false });

  const nameKey = cleanName(name);
  if (!nameKey) return NextResponse.json({ found: false });

  // 1) DB cache
  const cached = await prisma.exerciseMedia.findUnique({ where: { nameKey } });
  if (cached) {
    return NextResponse.json({ found: cached.found, gifUrl: cached.gifUrl });
  }

  // 2) No API key configured → don't cache, so it resolves once a key is added.
  const key = process.env.EXERCISEDB_API_KEY;
  if (!key) return NextResponse.json({ found: false, configured: false });

  // 3) Resolve from ExerciseDB, then cache the result (hit or miss).
  let gifUrl: string | null = null;
  for (const q of candidates(name)) {
    gifUrl = await fetchGif(q, key);
    if (gifUrl) break;
  }
  await prisma.exerciseMedia.create({
    data: { nameKey, gifUrl, found: !!gifUrl },
  });
  return NextResponse.json({ found: !!gifUrl, gifUrl });
}
