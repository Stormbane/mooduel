"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { SlimMoodMovie } from "@/lib/mood-data/types";
import { MoodProfileCard } from "@/components/movie/mood-profile-card";
import { StreamingProviders } from "@/components/movie/streaming-providers";
import { ShareButton } from "@/components/share/share-button";
import type { GameConfig, SharePayload } from "./types";

interface ResultScreenProps {
  game: GameConfig;
  /** The movie being shown — winner, leaf pick, daily answer. */
  movie: SlimMoodMovie;
  /** Optional eyebrow ("YOU CHOSE", "YOUR PICK", "TODAY'S ANSWER"). */
  eyebrow?: string;
  /** Optional headline above the movie card. */
  headline?: React.ReactNode;
  /** Optional content rendered between mood-card and streaming-providers. */
  children?: React.ReactNode;
  /** Share payload — omit to hide the share button. */
  sharePayload?: SharePayload;
  /** Short intent string for share text, e.g. "I picked Hereditary on Blind Taste Test." */
  shareIntent?: string;
  /** "Play again" handler. */
  onPlayAgain: () => void;
  /** Label for the primary CTA (defaults to "Play again"). */
  playAgainLabel?: string;
}

/**
 * Canonical game result screen. Every game ends here.
 *
 * Layout: eyebrow → headline → mood profile card → (optional children) →
 * streaming providers → share button + play again + more games.
 *
 * Any per-game differentiation goes in `children` or `headline`.
 * Layout and component identity do not vary.
 */
export function ResultScreen({
  game,
  movie,
  eyebrow,
  headline,
  children,
  sharePayload,
  shareIntent,
  onPlayAgain,
  playAgainLabel = "Play again",
}: ResultScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="pt-12"
    >
      {headline && (
        <div className="mb-8 text-center">
          {eyebrow && (
            <p
              className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3"
              style={{ color: game.accent.color }}
            >
              {eyebrow}
            </p>
          )}
          <h2 className="text-2xl sm:text-3xl font-[family-name:var(--font-display)] font-bold text-foreground/95 leading-tight max-w-xl mx-auto">
            {headline}
          </h2>
        </div>
      )}

      <MoodProfileCard
        movie={movie}
        accent={game.accent.color}
        eyebrow={!headline && eyebrow ? eyebrow : undefined}
      />

      {children}

      <StreamingProviders movieId={movie.id} />

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        {sharePayload && shareIntent && (
          <ShareButton
            game={game.id}
            payload={sharePayload}
            accent={game.accent.color}
            intent={shareIntent}
          />
        )}
        <button
          onClick={onPlayAgain}
          className="rounded-[4px] border border-[oklch(0.25_0_0)] px-5 py-2.5 text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-white/[0.03] transition-colors"
        >
          {playAgainLabel}
        </button>
        <Link
          href="/games"
          className="rounded-[4px] px-5 py-2.5 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          More games
        </Link>
      </div>
    </motion.div>
  );
}
