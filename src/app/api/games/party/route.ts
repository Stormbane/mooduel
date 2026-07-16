import { NextRequest, NextResponse } from "next/server";
import { serveParties } from "@/lib/games/server/party";

/**
 * GET /api/games/party?count=3
 * Serves dinner parties: seated guests, a shelf of six with per-guest
 * reactions precomputed, and the model's own pick for the reveal.
 */
export async function GET(req: NextRequest) {
  const count = Math.min(3, Math.max(1, parseInt(req.nextUrl.searchParams.get("count") ?? "3", 10) || 3));
  try {
    const parties = await serveParties(count);
    return NextResponse.json({ parties });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "party failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
