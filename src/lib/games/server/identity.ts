import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "./session";
import { getUserId } from "./service-client";

/**
 * Resolve the caller to exactly one identity — authed user if present,
 * else the signed anonymous session. The match RPCs require exactly one.
 */
export async function matchIdentity(
  req: NextRequest,
): Promise<{ userId: string | null; sessionId: string | null } | null> {
  const userId = await getUserId(req.headers.get("authorization"));
  if (userId) return { userId, sessionId: null };
  const sessionId = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (sessionId) return { userId: null, sessionId };
  return null;
}
