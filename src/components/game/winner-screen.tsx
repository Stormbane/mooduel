"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { posterUrl } from "@/lib/tmdb/client";
import type { TmdbMovieDetails, TmdbMovie } from "@/lib/types";
import { WINNER_INTROS, getRandomCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface WinnerScreenProps {
  movie: TmdbMovieDetails | TmdbMovie;
  onRestart: () => void;
}

function isMovieDetails(m: TmdbMovieDetails | TmdbMovie): m is TmdbMovieDetails {
  return "genres" in m;
}

export function WinnerScreen({ movie, onRestart }: WinnerScreenProps) {
  const details = isMovieDetails(movie) ? movie : null;
  const intro = useMemo(() => getRandomCopy(WINNER_INTROS), []);

  return (
    <div className="flex flex-col items-center gap-6 max-w-lg mx-auto">
      {/* Intro text with glitch */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="text-center space-y-2"
      >
        <p className="text-xs uppercase tracking-[0.4em] neon-text-cyan font-bold font-[family-name:var(--font-display)]">
          {intro}
        </p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)] uppercase neon-text-pink"
        >
          {movie.title}
        </motion.h1>
        {details?.tagline && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground italic"
          >
            &ldquo;{details.tagline}&rdquo;
          </motion.p>
        )}
      </motion.div>

      {/* Poster with neon border */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={cn(
          "relative w-56 md:w-72 aspect-[2/3] rounded-xl overflow-hidden",
          "border-2 border-[var(--color-neon-pink)]",
          "neon-glow-pink",
        )}
      >
        <Image
          src={posterUrl(movie.poster_path, "w780")}
          alt={movie.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 224px, 288px"
          priority
        />
      </motion.div>

      {/* Details */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="max-w-md text-center space-y-3"
      >
        {/* Meta row */}
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="text-muted-foreground">{movie.release_date?.slice(0, 4)}</span>
          <span className="neon-text-yellow font-bold">{movie.vote_average?.toFixed(1)}</span>
          {details?.runtime && (
            <span className="text-muted-foreground">
              {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
            </span>
          )}
        </div>

        {/* Genres */}
        {details?.genres && (
          <div className="flex flex-wrap justify-center gap-2">
            {details.genres.map((g) => (
              <span
                key={g.id}
                className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border border-[var(--color-neon-purple)]/40 text-[var(--color-neon-purple)] bg-[var(--color-neon-purple)]/5"
              >
                {g.name}
              </span>
            ))}
          </div>
        )}

        {/* Overview */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {movie.overview}
        </p>
      </motion.div>

      {/* Play again */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={onRestart}
        className={cn(
          "mt-4 rounded-lg px-8 py-3 text-sm font-bold uppercase tracking-wider",
          "font-[family-name:var(--font-display)]",
          "border border-[var(--color-neon-cyan)] text-[var(--color-neon-cyan)]",
          "hover:bg-[var(--color-neon-cyan)]/10 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]",
          "transition-all active:scale-95",
        )}
      >
        PLAY AGAIN
      </motion.button>
    </div>
  );
}
