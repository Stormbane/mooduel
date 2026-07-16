import { NextRequest, NextResponse } from "next/server";
import { matchIdentity } from "@/lib/games/server/identity";
import { getMatchState } from "@/lib/games/server/match";

/**
 * GET /api/games/match/{code}
 * Match state with per-identity visibility: everyone sees resolved
 * tricks and the deal; only you see your sealed cards, hand, and
 * committed card.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const id = (await matchIdentity(req)) ?? { userId: null, sessionId: null };
  try {
    const state = await getMatchState(code, id);
    return NextResponse.json(state);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "state failed";
    const status = msg === "unknown match" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
