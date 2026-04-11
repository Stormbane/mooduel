import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Extract user from auth header */
async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await anonClient.auth.getUser(token);
  return data.user;
}

/**
 * GET /api/profile
 *
 * Returns the authenticated user's profile, corrections, and vote history.
 */
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // User's corrections
  const { data: corrections } = await supabase
    .from("corrections")
    .select("*")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // User's votes
  const { data: votes } = await supabase
    .from("votes")
    .select("*, corrections(movie_id, proposed_values, original_values, justification, status, net_score)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Reputation history
  const { data: repEvents } = await supabase
    .from("reputation_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Stats
  const totalCorrections = corrections?.length || 0;
  const acceptedCorrections = corrections?.filter((c) => c.status === "accepted").length || 0;
  const totalVotes = votes?.length || 0;

  // Fetch movie titles for corrections
  const movieIds = [...new Set([
    ...(corrections?.map((c) => c.movie_id) || []),
    ...(votes?.map((v) => v.corrections?.movie_id).filter(Boolean) || []),
  ])];

  let movieTitles: Record<number, string> = {};
  if (movieIds.length > 0) {
    const { data: movies } = await supabase
      .from("movies")
      .select("tmdb_id, title")
      .in("tmdb_id", movieIds);
    if (movies) {
      movieTitles = Object.fromEntries(movies.map((m) => [m.tmdb_id, m.title]));
    }
  }

  return NextResponse.json({
    profile: profile || { display_name: user.user_metadata?.full_name, reputation: 0 },
    stats: { totalCorrections, acceptedCorrections, totalVotes, reputation: profile?.reputation || 0 },
    corrections: (corrections || []).map((c) => ({
      ...c,
      movieTitle: movieTitles[c.movie_id] || `Movie #${c.movie_id}`,
    })),
    votes: (votes || []).map((v) => ({
      ...v,
      movieTitle: movieTitles[v.corrections?.movie_id] || "Unknown",
    })),
    repEvents: repEvents || [],
  });
}
