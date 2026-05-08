import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateShareToken } from "@/lib/share";
import type { SharePayload } from "@/components/game-shell/types";

/**
 * POST /api/share
 * Body: { game: string, payload: SharePayload }
 * Returns: { token: string, url: string }
 *
 * Anonymous — anyone can create a share row. Token is a 10-char base62.
 */
export async function POST(req: Request) {
  let body: { game?: string; payload?: SharePayload };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { game, payload } = body;
  if (!game || typeof game !== "string" || !payload || typeof payload !== "object") {
    return NextResponse.json({ error: "game and payload required" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const token = generateShareToken(10);

  const { error } = await supabase
    .from("share_results")
    .insert({ token, game, payload });

  if (error) {
    // Extraordinarily unlikely collision — retry once with a fresh token
    const retryToken = generateShareToken(12);
    const { error: retryError } = await supabase
      .from("share_results")
      .insert({ token: retryToken, game, payload });
    if (retryError) {
      console.error("[share] insert failed twice", retryError);
      return NextResponse.json({ error: "share failed" }, { status: 500 });
    }
    return NextResponse.json({
      token: retryToken,
      url: `/s/${retryToken}`,
    });
  }

  return NextResponse.json({ token, url: `/s/${token}` });
}
