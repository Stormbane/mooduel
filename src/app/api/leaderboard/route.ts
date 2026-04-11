import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public read-only endpoint — use anon key (respects RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/leaderboard?limit=50
 *
 * Returns top contributors by reputation, with correction stats.
 */
export async function GET(req: NextRequest) {
  const limit = Math.min(
    100,
    parseInt(req.nextUrl.searchParams.get("limit") || "50")
  );

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, reputation")
    .order("reputation", { ascending: false })
    .gt("reputation", 0)
    .limit(limit);

  if (error) {
    console.error("[leaderboard:GET]", error.message);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }

  if (!profiles?.length) {
    return NextResponse.json({ leaders: [], stats: { totalCorrections: 0, totalVotes: 0, contributors: 0 } });
  }

  // Fetch correction counts per leaderboard user only (not all corrections)
  const userIds = profiles.map((p) => p.id);
  const { data: corrections } = await supabase
    .from("corrections")
    .select("author_id, status")
    .in("author_id", userIds);

  const correctionCounts: Record<string, { total: number; accepted: number }> = {};
  corrections?.forEach((c) => {
    if (!correctionCounts[c.author_id]) correctionCounts[c.author_id] = { total: 0, accepted: 0 };
    correctionCounts[c.author_id].total++;
    if (c.status === "accepted") correctionCounts[c.author_id].accepted++;
  });

  const leaders = profiles.map((row, i) => ({
    rank: i + 1,
    userId: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    reputation: row.reputation,
    corrections: correctionCounts[row.id]?.total || 0,
    accepted: correctionCounts[row.id]?.accepted || 0,
  }));

  // Global stats (cheap count queries)
  const [{ count: totalCorrections }, { count: totalVotes }] = await Promise.all([
    supabase.from("corrections").select("*", { count: "exact", head: true }),
    supabase.from("votes").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    leaders,
    stats: {
      totalCorrections: totalCorrections || 0,
      totalVotes: totalVotes || 0,
      contributors: profiles.length,
    },
  });
}
