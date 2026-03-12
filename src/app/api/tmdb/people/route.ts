import { NextRequest, NextResponse } from "next/server";
import { getPopularActors, getPopularDirectors } from "@/lib/tmdb/client";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "actors";
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);

  try {
    const people = type === "directors"
      ? await getPopularDirectors()
      : await getPopularActors(page);
    return NextResponse.json(people);
  } catch (e) {
    console.error("TMDB people error:", e);
    return NextResponse.json({ error: "Failed to fetch people" }, { status: 500 });
  }
}
