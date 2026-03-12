import { NextRequest, NextResponse } from "next/server";
import { discoverMovies } from "@/lib/tmdb/client";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  try {
    const movies = await discoverMovies(params);
    return NextResponse.json(movies);
  } catch (e) {
    console.error("TMDB discover error:", e);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}
