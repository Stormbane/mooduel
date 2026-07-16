import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public read-only endpoint — use anon key (respects RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/movies
 *
 * Paginated, filterable movie list.
 *
 * Query params:
 *   page     - page number (default 1)
 *   limit    - items per page (default 60, max 200)
 *   search   - full-text search on title + vibe sentence
 *   pacing   - comma-separated pacing filter
 *   ending   - comma-separated ending filter
 *   context  - comma-separated watch context filter (solo, date, friends, family)
 *   sort     - sort field (default: tmdb_rating desc)
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // Direct lookup by tmdb ids (bypasses pagination/filters) — used by game
  // result screens that need full mood records for a handful of movies.
  const idsParam = params.get("ids");
  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((s) => parseInt(s, 10))
      .filter(Number.isFinite)
      .slice(0, 50);
    if (ids.length === 0) {
      return NextResponse.json({ movies: [], total: 0, page: 1, limit: 0 });
    }
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .in("tmdb_id", ids);
    if (error) {
      console.error("[movies:GET ids]", error.message);
      return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
    }
    return NextResponse.json({
      movies: (data || []).map(toSlim),
      total: data?.length || 0,
      page: 1,
      limit: ids.length,
    });
  }

  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(params.get("limit") || "60")));
  const rawSearch = params.get("search")?.trim();
  // Sanitize: strip special chars that could interfere with Supabase query syntax
  const search = rawSearch?.replace(/[%_\\{}()|&!<>]/g, "").slice(0, 100);
  const pacing = params.get("pacing")?.split(",").filter(Boolean);
  const ending = params.get("ending")?.split(",").filter(Boolean);
  const context = params.get("context")?.split(",").filter(Boolean);

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("movies")
    .select("*", { count: "exact" });

  // Full-text search on title and vibe sentence
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,vibe_sentence.ilike.%${search}%,mood_tags.cs.{${search}}`
    );
  }

  // Filters
  if (pacing?.length) query = query.in("pacing", pacing);
  if (ending?.length) query = query.in("ending_type", ending);
  if (context?.length) query = query.overlaps("watch_context", context);

  // Sort and paginate
  query = query
    .order("tmdb_rating", { ascending: false, nullsFirst: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("[movies:GET]", error.message);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }

  return NextResponse.json({
    movies: (data || []).map(toSlim),
    total: count || 0,
    page,
    limit,
  });
}

/** Map database row to SlimMoodMovie shape for client compatibility */
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
