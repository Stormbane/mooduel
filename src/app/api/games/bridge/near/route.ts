import { NextRequest, NextResponse } from "next/server";
import { nearMovies } from "@/lib/games/server/bridge";
import { clampBridgeDate } from "@/lib/games/server/bridge-date";

/**
 * GET /api/games/bridge/near?from=<tmdbId>&date=YYYY-MM-DD
 * The hint rail: movies within one hop of `from` under that day's budget.
 */
export async function GET(req: NextRequest) {
  const fromId = parseInt(req.nextUrl.searchParams.get("from") ?? "", 10);
  if (!Number.isFinite(fromId)) {
    return NextResponse.json({ error: "from required" }, { status: 400 });
  }
  const date = clampBridgeDate(req.nextUrl.searchParams.get("date"));
  try {
    const movies = await nearMovies(date, fromId);
    return NextResponse.json(
      { movies },
      { headers: { "Cache-Control": "public, s-maxage=300" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "near failed";
    const status = msg === "unknown movie" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
