import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/corrections/vote
 *
 * Cast or change a vote on a correction.
 * Body: { correction_id, value } where value is 1 (upvote) or -1 (downvote)
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json();
  const { correction_id, value } = body;

  if (!correction_id || (value !== 1 && value !== -1)) {
    return NextResponse.json(
      { error: "correction_id and value (1 or -1) required" },
      { status: 400 }
    );
  }

  // Use the atomic cast_vote function
  const { error } = await supabase.rpc("cast_vote", {
    p_correction_id: correction_id,
    p_user_id: user.id,
    p_value: value,
  });

  if (error) {
    console.error("[vote:POST]", error.message);
    return NextResponse.json({ error: "Failed to cast vote" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
