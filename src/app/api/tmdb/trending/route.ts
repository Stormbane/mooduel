import { NextResponse } from "next/server";
import { getTrendingMovies } from "@/lib/tmdb/client";

export async function GET() {
  try {
    const movies = await getTrendingMovies("week");
    return NextResponse.json(movies);
  } catch (e) {
    console.error("TMDB trending error:", e);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}
