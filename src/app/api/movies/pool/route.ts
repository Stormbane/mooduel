import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public read-only endpoint — use anon key (respects RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/movies/pool
 *
 * Returns all game-quality movies (rating >= 5, vibe sentence > 10 chars)
 * in SlimMoodMovie format. Used by game pages that need the full dataset
 * for client-side distance matching, scoring, and filtering.
 *
 * Fetches in batches to bypass Supabase's 1000-row default limit.
 * Cached aggressively — this data rarely changes.
 */
export async function GET() {
  const PAGE_SIZE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .gte("tmdb_rating", 5)
      .order("tmdb_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const movies = all
    .filter((row) => row.vibe_sentence && row.vibe_sentence.length > 10)
    .map(toSlim);

  return NextResponse.json(movies, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSlim(row: any) {
  return {
    id: row.tmdb_id,
    t: row.title,
    y: row.year,
    g: row.genres,
    rt: row.runtime,
    r: row.tmdb_rating,
    v: row.vibe_sentence,
    va: row.valence,
    ar: row.arousal,
    do: row.dominance,
    ab: row.absorption,
    he: row.hedonic,
    eu: row.eudaimonic,
    pr: row.psych_rich,
    arc: row.emotional_arc,
    em: row.dominant_emotions,
    tags: row.mood_tags,
    wc: row.watch_context,
    pa: row.pacing,
    end: row.ending_type,
    co: row.comfort_level,
    warn: row.safety_warnings,
    conv: row.conversation_potential,
    rtc: row.rt_critic,
    rta: row.rt_audience,
    imdb: row.imdb_rating,
    pp: row.poster_path,
  };
}
