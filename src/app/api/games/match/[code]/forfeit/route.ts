import { NextRequest, NextResponse } from "next/server";
import { matchIdentity } from "@/lib/games/server/identity";
import { forfeitMatch } from "@/lib/games/server/match";

/** POST /api/games/match/{code}/forfeit — concede the table. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const id = await matchIdentity(req);
  if (!id) return NextResponse.json({ error: "no session" }, { status: 401 });
  try {
    const status = await forfeitMatch(code, id);
    return NextResponse.json({ status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "forfeit failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
