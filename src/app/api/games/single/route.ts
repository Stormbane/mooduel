import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/games/server/session";
import { getUserId, ipHash } from "@/lib/games/server/service-client";
import { dealSingle, dealSingles } from "@/lib/games/server/pool";
import { CATEGORICAL_DIMENSIONS, type CategoricalDimension } from "@/lib/games/dimensions";

/**
 * GET /api/games/single?dimension=arc&game=shape-of-stories&v=1&p=sos-v1
 * Deals a single-movie categorical assignment. With &count=N (max 20)
 * returns { singles: [...] } — batch surfaces like Seen It.
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

  const countRaw = req.nextUrl.searchParams.get("count");
  const count = countRaw ? Math.min(20, Math.max(1, parseInt(countRaw, 10) || 1)) : null;

  try {
    const opts = {
      dimension,
      sessionId,
      userId: await getUserId(req.headers.get("authorization")),
      game,
      gameVersion,
      promptVersion,
      ipHash: ipHash(req),
    };
    if (count) {
      return NextResponse.json({ singles: await dealSingles(count, opts) });
    }
    const single = await dealSingle(opts);
    return NextResponse.json(single);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "deal failed";
    const status = msg.includes("cap reached") ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
