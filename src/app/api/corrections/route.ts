import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Read operations use anon key (respects RLS)
const readClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Write operations use service role (bypasses RLS for server-validated inserts)
const writeClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Extract and verify user from Authorization header */
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
 * GET /api/corrections?movie_id=123
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const movieId = params.get("movie_id");
  const ALLOWED_STATUSES = ["pending", "accepted", "rejected", "superseded"];
  const rawStatus = params.get("status") || "pending";
  const status = ALLOWED_STATUSES.includes(rawStatus) ? rawStatus : "pending";

  if (!movieId) {
    return NextResponse.json({ error: "movie_id required" }, { status: 400 });
  }

  // Also fetch user's votes if authenticated
  const user = await getUser(req);

  const { data: corrections, error } = await readClient
    .from("corrections")
    .select("*, profiles!corrections_author_id_fkey(display_name, avatar_url)")
    .eq("movie_id", parseInt(movieId))
    .eq("status", status)
    .order("net_score", { ascending: false });

  if (error) {
    console.error("[corrections:GET]", error.message);
    return NextResponse.json({ error: "Failed to fetch corrections" }, { status: 500 });
  }

  // If user is authenticated, fetch their votes on these corrections
  let userVotes: Record<string, number> = {};
  if (user && corrections?.length) {
    const correctionIds = corrections.map((c) => c.id);
    const { data: votes } = await readClient
      .from("votes")
      .select("correction_id, value")
      .eq("user_id", user.id)
      .in("correction_id", correctionIds);

    if (votes) {
      userVotes = Object.fromEntries(votes.map((v) => [v.correction_id, v.value]));
    }
  }

  return NextResponse.json({ corrections: corrections || [], userVotes });
}

/**
 * POST /api/corrections
 *
 * Submit a new correction. Requires authentication.
 * Body: { movie_id, proposed_values, original_values, justification }
 */
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const { movie_id, proposed_values, original_values, justification } = body;

  if (!movie_id || !Number.isInteger(Number(movie_id)) || !proposed_values || !justification) {
    return NextResponse.json(
      { error: "Valid movie_id, proposed_values, and justification required" },
      { status: 400 }
    );
  }

  if (typeof justification !== "string" || justification.length < 10 || justification.length > 2000) {
    return NextResponse.json(
      { error: "Justification must be 10-2000 characters" },
      { status: 400 }
    );
  }

  const { data, error } = await writeClient
    .from("corrections")
    .insert({
      movie_id,
      author_id: user.id,
      proposed_values,
      original_values: original_values || {},
      justification,
    })
    .select()
    .single();

  if (error) {
    console.error("[corrections:POST]", error.message);
    return NextResponse.json({ error: "Failed to submit correction" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
