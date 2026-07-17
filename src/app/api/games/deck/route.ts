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
  // Movies the player marked known in Seen It — seeds the draft pool so
  // strangers to the corpus still get a hand they can reason about.
  const prefer = (req.nextUrl.searchParams.get("prefer") ?? "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter(Number.isFinite)
    .slice(0, 100);
  try {
    const deck = await dealDeck(count, prefer);
    return NextResponse.json({ deck });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "deck failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
