import { NextRequest, NextResponse } from "next/server";

/**
 * games.mooduel.com → the /games tree. DNS + Vercel domain config is a
 * separate ops step; this code path is ready the moment the domain is.
 *
 * On a games.* host, bare paths map into the games tree ("/" → "/games",
 * "/hotter" → "/games/hotter"). APIs, share pages, assets, and paths
 * already under /games pass through untouched, so absolute links keep
 * working on either domain.
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  if (!host.startsWith("games.")) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/games") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/games" : `/games${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png).*)"],
};
