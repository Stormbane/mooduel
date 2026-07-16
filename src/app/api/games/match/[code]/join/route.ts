import { NextRequest, NextResponse } from "next/server";
import { matchIdentity } from "@/lib/games/server/identity";
import { joinCardMatch, getMatchState } from "@/lib/games/server/match";

/**
 * POST /api/games/match/{code}/join
 * Claim seat 2 on an open challenge.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const id = await matchIdentity(req);
  if (!id) return NextResponse.json({ error: "no session" }, { status: 401 });
  try {
    await joinCardMatch(code, id);
    return NextResponse.json(await getMatchState(code, id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "join failed";
    const status = /unknown match code|match not open|already seated/.test(msg) ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
