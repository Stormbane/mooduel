import { ImageResponse } from "next/og";
import { createServerSupabase } from "@/lib/supabase/server";
import { GAMES, type SharePayload, type GameId } from "@/components/game-shell/types";

export const alt = "Mooduel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic OG image for /s/{token}. Rendered server-side at request time
 * by Next.js edge runtime; result is cached via the usual Next caching.
 */
export default async function Image(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createServerSupabase();
  const { data: share } = await supabase
    .from("share_results")
    .select("game, payload")
    .eq("token", token)
    .maybeSingle();

  const fallback = { title: "Mooduel", vibe: "Movies scored by how they make you feel.", accent: "#E91E8C", eyebrow: "Mooduel" };

  if (!share) {
    return renderOg(fallback);
  }

  const payload = share.payload as SharePayload;
  const pickedId = "pickedMovieId" in payload ? payload.pickedMovieId : null;

  let title = fallback.title;
  let vibe = fallback.vibe;
  let year: number | null = null;
  if (pickedId) {
    const { data: movie } = await supabase
      .from("movies")
      .select("title, year, vibe_sentence")
      .eq("tmdb_id", pickedId)
      .maybeSingle();
    if (movie) {
      title = movie.title;
      year = movie.year;
      vibe = movie.vibe_sentence;
    }
  }

  const gameCfg = GAMES[share.game as GameId];
  const accent = gameCfg?.accent.color ?? fallback.accent;
  const eyebrow = gameCfg?.title ?? fallback.eyebrow;

  return renderOg({
    title: year ? `${title} (${year})` : title,
    vibe,
    accent,
    eyebrow,
  });
}

function renderOg({
  title,
  vibe,
  accent,
  eyebrow,
}: {
  title: string;
  vibe: string;
  accent: string;
  eyebrow: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0a",
          color: "white",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top row: eyebrow + logo mark */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {eyebrow}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
            Mooduel
          </div>
        </div>

        {/* Title + vibe */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: title.length > 42 ? 60 : 80,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: "#fafafa",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 34,
              lineHeight: 1.3,
              fontStyle: "italic",
              color: "#d4d4d4",
              maxWidth: 1000,
            }}
          >
            &ldquo;{vibe}&rdquo;
          </div>
        </div>

        {/* Bottom row: accent bar + tagline */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 80, height: 4, backgroundColor: accent, display: "flex" }} />
          <div style={{ fontSize: 20, color: "#737373" }}>
            Movies scored by how they make you feel.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
