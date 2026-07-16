import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageLayout } from "@/components/layout/page-layout";
import { MoodProfileCard } from "@/components/movie/mood-profile-card";
import { StreamingProviders } from "@/components/movie/streaming-providers";
import { GAMES, type SharePayload, type GameId } from "@/components/game-shell/types";
import type { SlimMoodMovie } from "@/lib/mood-data/types";

/**
 * SSR share page. Crawlable by Twitter/Bluesky/etc. so OG tags resolve to
 * a real result. Token is a 10-12 char base62 string stored in share_results.
 */

interface ShareRow {
  token: string;
  game: string;
  payload: SharePayload;
  created_at: string;
}

async function loadShare(token: string): Promise<ShareRow | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("share_results")
    .select("token, game, payload, created_at")
    .eq("token", token)
    .maybeSingle();
  return data as ShareRow | null;
}

async function loadMovieBySlim(movieId: number): Promise<SlimMoodMovie | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("movies")
    .select("*")
    .eq("tmdb_id", movieId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.tmdb_id,
    t: data.title,
    y: data.year,
    g: data.genres || [],
    rt: data.runtime,
    r: data.tmdb_rating,
    v: data.vibe_sentence,
    va: data.valence,
    ar: data.arousal,
    do: data.dominance,
    ab: data.absorption,
    he: data.hedonic,
    eu: data.eudaimonic,
    pr: data.psych_rich,
    arc: data.emotional_arc,
    em: data.dominant_emotions || [],
    tags: data.mood_tags || [],
    wc: data.watch_context || [],
    pa: data.pacing,
    end: data.ending_type,
    co: data.comfort_level,
    warn: data.safety_warnings || [],
    conv: data.conversation_potential,
    rtc: data.rt_critic,
    rta: data.rt_audience,
    imdb: data.imdb_rating,
    pp: data.poster_path,
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  const { token } = await params;
  const share = await loadShare(token);
  if (!share) return { title: "Mooduel" };

  const payload = share.payload as SharePayload;
  const pickedId = "pickedMovieId" in payload ? payload.pickedMovieId : null;
  const movie = pickedId ? await loadMovieBySlim(pickedId) : null;
  const gameCfg = GAMES[share.game as GameId];

  const title = movie
    ? `${movie.t} (${movie.y}) · ${gameCfg?.title ?? "Mooduel"}`
    : "Mooduel";
  const description = movie?.v ?? "Movies scored by how they make you feel.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/s/${token}/opengraph-image`, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/s/${token}/opengraph-image`],
    },
  };
}

export default async function SharePage(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const share = await loadShare(token);
  if (!share) notFound();

  const payload = share.payload as SharePayload;
  const pickedId = "pickedMovieId" in payload ? payload.pickedMovieId : null;
  const movie = pickedId ? await loadMovieBySlim(pickedId) : null;
  const gameCfg = GAMES[share.game as GameId] ?? null;

  if (!movie || !gameCfg) {
    return (
      <PageLayout maxWidth="max-w-2xl">
        <div className="pt-20 text-center">
          <p className="text-muted-foreground">This share no longer resolves.</p>
          <Link
            href="/games"
            className="inline-block mt-6 rounded-[4px] border border-[oklch(0.25_0_0)] px-5 py-2.5 text-sm"
          >
            Try a game
          </Link>
        </div>
      </PageLayout>
    );
  }

  const eyebrowByGame: Record<string, string> = {
    hotter: "Hotter · hottest take",
    "shape-of-stories": "Shape of Stories · gallery",
    "mood-bridge": "Mood Bridge · crossing",
    "blind-taste": "Blind Taste Test · pick",
    "vibe-tree": "Vibe Tree · destination",
    "mood-drift": "Mood Drift · today",
  };

  return (
    <PageLayout maxWidth="max-w-2xl">
      <div className="pt-12 pb-20">
        <p
          className="text-[11px] font-semibold tracking-[0.2em] uppercase text-center mb-6"
          style={{ color: gameCfg.accent.color }}
        >
          {eyebrowByGame[share.game] ?? gameCfg.title}
        </p>

        <MoodProfileCard movie={movie} accent={gameCfg.accent.color} />

        <StreamingProviders movieId={movie.id} />

        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link
            href={gameCfg.path}
            className="rounded-[4px] px-5 py-2.5 text-sm font-semibold tracking-wide text-white transition-transform duration-100 hover:brightness-110 active:scale-[0.97]"
            style={{ backgroundColor: gameCfg.accent.color }}
          >
            Try it yourself
          </Link>
          <Link
            href="/games"
            className="rounded-[4px] border border-[oklch(0.25_0_0)] px-5 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-white/[0.03] transition-colors"
          >
            More games
          </Link>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground/40">
          Shared via Mooduel · Movies scored by how they make you feel.
        </p>
      </div>
    </PageLayout>
  );
}
