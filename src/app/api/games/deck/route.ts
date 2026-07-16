import { NextRequest, NextResponse } from "next/server";
import { dealDeck } from "@/lib/games/server/pool";

/**
 * GET /api/games/deck?count=16
 * A face-up deck from the recognizable pool for the card game's draft.
 */
export async function GET(req: NextRequest) {
  const count = Math.min(
    32,
    Math.max(8, parseInt(req.nextUrl.searchParams.get("count") ?? "16", 10) || 16),
  );
  try {
    const deck = await dealDeck(count);
    return NextResponse.json({ deck });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "deck failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
