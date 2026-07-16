import { NextRequest, NextResponse } from "next/server";
import { matchIdentity } from "@/lib/games/server/identity";
import { pickHand, getMatchState } from "@/lib/games/server/match";

/**
 * POST /api/games/match/{code}/hand
 * Body: { cardIds: number[8] } — the sealed draft. Costs no turn.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const id = await matchIdentity(req);
  if (!id) return NextResponse.json({ error: "no session" }, { status: 401 });
  let body: { cardIds?: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!Array.isArray(body.cardIds)) {
    return NextResponse.json({ error: "cardIds required" }, { status: 400 });
  }
  try {
    await pickHand(code, id, body.cardIds);
    return NextResponse.json(await getMatchState(code, id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "pick failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
