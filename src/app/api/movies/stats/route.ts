import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public read-only endpoint — use anon key (respects RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/movies/stats
 *
 * Aggregated statistics for the dashboard.
 * Uses multiple targeted queries instead of fetching all rows.
 */
export async function GET() {
  // Averages via count
  const { count: totalCount } = await supabase
    .from("movies")
    .select("*", { count: "exact", head: true });

  const n = totalCount || 0;
  if (n === 0) return NextResponse.json({ n: 0 });

  // Fetch all movies in batches for aggregation
  // Supabase limits to 1000 rows per query
  const allMovies = await fetchAllMovies();

  const avgV = allMovies.reduce((s, m) => s + m.valence, 0) / n;
  const avgA = allMovies.reduce((s, m) => s + m.arousal, 0) / n;
  const avgComfort = allMovies.reduce((s, m) => s + m.comfort_level, 0) / n;
  const avgConv = allMovies.reduce((s, m) => s + m.conversation_potential, 0) / n;

  // Distributions
  const countField = (key: string) => {
    const counts: Record<string, number> = {};
    allMovies.forEach((m) => {
      const val = (m as Record<string, unknown>)[key] as string;
      counts[val] = (counts[val] || 0) + 1;
    });
    return toBar(counts);
  };

  const genreCounts: Record<string, number> = {};
  allMovies.forEach((m) =>
    (m.genres as string[]).forEach((g) => (genreCounts[g] = (genreCounts[g] || 0) + 1))
  );

  // Superlatives
  let mostPleasant = allMovies[0];
  let mostUnpleasant = allMovies[0];
  let highestConvo = allMovies[0];
  let mostAbsorbing = allMovies[0];
  let comfyHorror: typeof allMovies[0] | null = null;
  let uncomfyComedy: typeof allMovies[0] | null = null;

  for (const m of allMovies) {
    if (m.valence > mostPleasant.valence) mostPleasant = m;
    if (m.valence < mostUnpleasant.valence) mostUnpleasant = m;
    if (m.conversation_potential > highestConvo.conversation_potential) highestConvo = m;
    if (m.absorption > mostAbsorbing.absorption) mostAbsorbing = m;
    if ((m.genres as string[]).includes("Horror") && (!comfyHorror || m.comfort_level > comfyHorror.comfort_level))
      comfyHorror = m;
    if ((m.genres as string[]).includes("Comedy") && (!uncomfyComedy || m.comfort_level < uncomfyComedy.comfort_level))
      uncomfyComedy = m;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toSuperlative = (m: any) => ({
    id: m.tmdb_id,
    t: m.title,
    y: m.year,
    v: m.vibe_sentence,
    va: m.valence,
    ar: m.arousal,
    co: m.comfort_level,
    conv: m.conversation_potential,
    ab: m.absorption,
    pp: m.poster_path,
    g: m.genres,
    r: m.tmdb_rating,
    end: m.ending_type,
    pa: m.pacing,
    arc: m.emotional_arc,
  });

  return NextResponse.json(
    {
      n,
      avgV,
      avgA,
      avgComfort,
      avgConv,
      arcs: countField("emotional_arc"),
      pacings: countField("pacing"),
      endings: countField("ending_type"),
      genres: toBar(genreCounts),
      mostPleasant: toSuperlative(mostPleasant),
      mostUnpleasant: toSuperlative(mostUnpleasant),
      highestConvo: toSuperlative(highestConvo),
      mostAbsorbing: toSuperlative(mostAbsorbing),
      comfyHorror: comfyHorror ? toSuperlative(comfyHorror) : null,
      uncomfyComedy: uncomfyComedy ? toSuperlative(uncomfyComedy) : null,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}

/** Fetch all movies in batches of 1000 */
async function fetchAllMovies() {
  const PAGE_SIZE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let from = 0;

  while (true) {
    const { data } = await supabase
      .from("movies")
      .select(
        "valence, arousal, comfort_level, conversation_potential, absorption, emotional_arc, pacing, ending_type, genres, tmdb_id, title, year, vibe_sentence, tmdb_rating, poster_path"
      )
      .range(from, from + PAGE_SIZE - 1);

    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

function toBar(obj: Record<string, number>) {
  const entries = Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const max = entries[0]?.[1] || 1;
  return entries.map(([label, value]) => ({
    label,
    value,
    pct: (value / max) * 100,
  }));
}
