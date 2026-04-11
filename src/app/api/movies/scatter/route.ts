import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public read-only endpoint — use anon key (respects RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/movies/scatter
 *
 * Lightweight endpoint for the mood map scatter plot.
 * Returns fields needed for dots + hover tooltip.
 * Fetches all movies in batches to bypass the 1000-row limit.
 */
export async function GET() {
  const PAGE_SIZE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("movies")
      .select("tmdb_id, title, year, valence, arousal, genres, tmdb_rating, vibe_sentence, pacing, ending_type")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const points = all.map((row) => ({
    id: row.tmdb_id,
    t: row.title,
    y: row.year,
    va: row.valence,
    ar: row.arousal,
    g: row.genres,
    r: row.tmdb_rating,
    v: row.vibe_sentence,
    pa: row.pacing,
    end: row.ending_type,
  }));

  return NextResponse.json(points, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
