import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * GET /api/watch-providers/{movieId}
 *
 * Returns country-scoped streaming availability for a single movie.
 * Uses TMDB `/movie/{id}/watch/providers` under the hood. Country is
 * detected from Vercel's `x-vercel-ip-country` header; falls back to
 * `?country=XX` query param, then to "US".
 *
 * Response shape:
 *   { country: "US", providers: { flatrate: [...], rent: [...], buy: [...] }, tmdbLink?: string }
 *
 * Cached for 7 days (revalidate: 604800). Provider availability rarely
 * changes day-to-day, and stale data is harmless.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ movieId: string }> },
) {
  const { movieId } = await params;
  const id = Number(movieId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "invalid movie id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const hdrs = await headers();
  const country =
    hdrs.get("x-vercel-ip-country") ||
    url.searchParams.get("country") ||
    "US";

  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "tmdb token not configured" }, { status: 500 });
  }

  try {
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/watch/providers`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 604800 }, // 7 days
      },
    );
    if (!tmdbRes.ok) {
      return NextResponse.json(
        { error: `tmdb ${tmdbRes.status}` },
        { status: 502 },
      );
    }
    const data = await tmdbRes.json();
    const countryData = data.results?.[country] || null;
    return NextResponse.json({
      country,
      providers: countryData
        ? {
            flatrate: countryData.flatrate || [],
            rent: countryData.rent || [],
            buy: countryData.buy || [],
          }
        : { flatrate: [], rent: [], buy: [] },
      tmdbLink: countryData?.link || null,
    });
  } catch (err) {
    console.error("[watch-providers] fetch failed", err);
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
