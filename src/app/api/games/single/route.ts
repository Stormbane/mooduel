import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/games/server/session";
import { getUserId, ipHash } from "@/lib/games/server/service-client";
import { dealSingle } from "@/lib/games/server/pool";
import { CATEGORICAL_DIMENSIONS, type CategoricalDimension } from "@/lib/games/dimensions";

/**
 * GET /api/games/single?dimension=arc&game=shape-of-stories&v=1&p=sos-v1
 * Deals a single-movie categorical assignment from the recognizable pool.
 * 401 without a valid session cookie (fetch /api/games/session first).
 */
export async function GET(req: NextRequest) {
  const sessionId = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!sessionId) return NextResponse.json({ error: "no session" }, { status: 401 });

  const dimension = req.nextUrl.searchParams.get("dimension") as CategoricalDimension;
  if (!CATEGORICAL_DIMENSIONS.includes(dimension)) {
    return NextResponse.json({ error: "invalid dimension" }, { status: 400 });
  }
  const game = req.nextUrl.searchParams.get("game") ?? "shape-of-stories";
  const gameVersion = req.nextUrl.searchParams.get("v") ?? "1";
  const promptVersion = req.nextUrl.searchParams.get("p") ?? "v1";

  try {
    const single = await dealSingle({
      dimension,
      sessionId,
      userId: await getUserId(req.headers.get("authorization")),
      game,
      gameVersion,
      promptVersion,
      ipHash: ipHash(req),
    });
    return NextResponse.json(single);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "deal failed";
    const status = msg.includes("cap reached") ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
