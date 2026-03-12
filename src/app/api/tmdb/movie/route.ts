import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails } from "@/lib/tmdb/client";

export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Missing movie id" }, { status: 400 });
  }

  try {
    const movie = await getMovieDetails(id);
    return NextResponse.json(movie);
  } catch (e) {
    console.error("TMDB movie error:", e);
    return NextResponse.json({ error: "Failed to fetch movie" }, { status: 500 });
  }
}
