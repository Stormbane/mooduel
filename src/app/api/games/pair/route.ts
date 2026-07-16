import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/games/server/session";
import { getUserId, ipHash } from "@/lib/games/server/service-client";
import { dealPair } from "@/lib/games/server/pool";
import { PAIRWISE_DIMENSIONS, type PairwiseDimension } from "@/lib/games/dimensions";

/**
 * GET /api/games/pair?dimension=arousal&game=hotter&v=1
 * Deals a served pairwise assignment for the caller's session.
 * 401 without a valid session cookie (fetch /api/games/session first).
 */
export async function GET(req: NextRequest) {
  const sessionId = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!sessionId) return NextResponse.json({ error: "no session" }, { status: 401 });

  const dimension = req.nextUrl.searchParams.get("dimension") as PairwiseDimension;
  if (!PAIRWISE_DIMENSIONS.includes(dimension)) {
    return NextResponse.json({ error: "invalid dimension" }, { status: 400 });
  }
  const game = req.nextUrl.searchParams.get("game") ?? "hotter";
  const gameVersion = req.nextUrl.searchParams.get("v") ?? "1";

  try {
    const pair = await dealPair({
      dimension,
      sessionId,
      userId: await getUserId(req.headers.get("authorization")),
      game,
      gameVersion,
      ipHash: ipHash(req),
    });
    return NextResponse.json(pair);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "deal failed";
    const status = msg.includes("cap reached") ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
