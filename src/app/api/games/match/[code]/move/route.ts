import { NextRequest, NextResponse } from "next/server";
import { matchIdentity } from "@/lib/games/server/identity";
import { playTurn } from "@/lib/games/server/match";
import { CATEGORIES, type Category } from "@/lib/games/card-game";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/games/match/{code}/move
 * Body: { expectedVersion, idempotencyKey, follow?: {cardId}, lead?: {category, cardId} }
 * One bundled turn: follow the open trick, counter-lead the next.
 * Legality is validated here; concurrency belongs to submit_move.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const id = await matchIdentity(req);
  if (!id) return NextResponse.json({ error: "no session" }, { status: 401 });

  let body: {
    expectedVersion?: number;
    idempotencyKey?: string;
    follow?: { cardId?: number };
    lead?: { category?: string; cardId?: number };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof body.expectedVersion !== "number" || !UUID_RE.test(body.idempotencyKey ?? "")) {
    return NextResponse.json({ error: "expectedVersion and idempotencyKey required" }, { status: 400 });
  }
  if (body.lead && (!CATEGORIES.includes(body.lead.category as Category) || typeof body.lead.cardId !== "number")) {
    return NextResponse.json({ error: "malformed lead" }, { status: 400 });
  }
  if (body.follow && typeof body.follow.cardId !== "number") {
    return NextResponse.json({ error: "malformed follow" }, { status: 400 });
  }

  try {
    const result = await playTurn(code, id, {
      expectedVersion: body.expectedVersion,
      idempotencyKey: body.idempotencyKey!,
      follow: body.follow as { cardId: number } | undefined,
      lead: body.lead as { category: Category; cardId: number } | undefined,
    });
    const ok = result.status === "accepted";
    return NextResponse.json(result, { status: ok ? 200 : 409 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "move failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
