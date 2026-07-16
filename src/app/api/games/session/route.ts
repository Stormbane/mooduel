import { NextRequest, NextResponse } from "next/server";
import { mintSessionToken, verifySessionToken, SESSION_COOKIE } from "@/lib/games/server/session";

/**
 * GET /api/games/session — ensure the caller holds a valid signed session.
 * Returns { sessionId } and (re)sets the httpOnly cookie when missing or
 * expired. This is the only place session tokens are minted.
 */
export async function GET(req: NextRequest) {
  const existing = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (existing) return NextResponse.json({ sessionId: existing });

  const { token, sessionId, maxAge } = mintSessionToken();
  const res = NextResponse.json({ sessionId });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  });
  return res;
}
