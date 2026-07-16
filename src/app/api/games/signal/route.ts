import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/games/server/session";
import { serviceClient, getUserId } from "@/lib/games/server/service-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/games/signal
 * Body: { events: [{ assignmentId, clientEventId, choice }] } (max 20)
 * Returns per-event acceptance: { results: [{ clientEventId, status }] }.
 * The RPC derives everything else from the locked assignment.
 */
export async function POST(req: NextRequest) {
  const sessionId = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!sessionId) return NextResponse.json({ error: "no session" }, { status: 401 });

  let body: { events?: { assignmentId: string; clientEventId: string; choice: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const events = body.events ?? [];
  if (!Array.isArray(events) || events.length === 0 || events.length > 20) {
    return NextResponse.json({ error: "events must be 1-20 items" }, { status: 400 });
  }

  const userId = await getUserId(req.headers.get("authorization"));
  const results = [];
  for (const e of events) {
    if (!UUID_RE.test(e.assignmentId ?? "") || !UUID_RE.test(e.clientEventId ?? "") || typeof e.choice !== "string" || e.choice.length > 40) {
      results.push({ clientEventId: e.clientEventId ?? null, status: "malformed" });
      continue;
    }
    const { data, error } = await serviceClient.rpc("submit_signal", {
      p_assignment_id: e.assignmentId,
      p_client_event_id: e.clientEventId,
      p_choice: e.choice,
      p_session_id: sessionId,
      p_user_id: userId,
    });
    results.push({ clientEventId: e.clientEventId, status: error ? "error" : (data as string) });
  }
  return NextResponse.json({ results });
}
