import { NextRequest, NextResponse } from "next/server";
import { getTopRatedMovies } from "@/lib/tmdb/client";

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  try {
    const movies = await getTopRatedMovies(page);
    return NextResponse.json(movies);
  } catch (e) {
    console.error("TMDB top-rated error:", e);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}
