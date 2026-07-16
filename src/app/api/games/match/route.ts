import { NextRequest, NextResponse } from "next/server";
import { matchIdentity } from "@/lib/games/server/identity";
import { createCardMatch } from "@/lib/games/server/match";

/**
 * POST /api/games/match
 * Creates a card-game challenge: seals 12 cards per seat, returns the
 * shareable code. Caller takes seat 1.
 */
export async function POST(req: NextRequest) {
  const id = await matchIdentity(req);
  if (!id) return NextResponse.json({ error: "no session" }, { status: 401 });
  try {
    const { code } = await createCardMatch(id);
    return NextResponse.json({ code, url: `/games/card-game/m/${code}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "create failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
