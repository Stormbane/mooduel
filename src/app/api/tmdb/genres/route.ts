import { NextResponse } from "next/server";
import { getGenres } from "@/lib/tmdb/client";

export async function GET() {
  try {
    const genres = await getGenres();
    return NextResponse.json(genres);
  } catch (e) {
    console.error("TMDB genres error:", e);
    return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
  }
}
