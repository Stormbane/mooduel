import { NextRequest, NextResponse } from "next/server";
import { dailyPuzzle } from "@/lib/games/server/bridge";
import { clampBridgeDate } from "@/lib/games/server/bridge-date";

/**
 * GET /api/games/bridge/daily?date=YYYY-MM-DD
 * Today's bridge. The client passes its local date (daily puzzles follow
 * the player's midnight); the server clamps it to ±1 day of UTC now.
 */
export async function GET(req: NextRequest) {
  const date = clampBridgeDate(req.nextUrl.searchParams.get("date"));
  try {
    const puzzle = await dailyPuzzle(date);
    return NextResponse.json(puzzle, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bridge failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
