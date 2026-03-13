"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { posterUrl } from "@/lib/tmdb/client";
import type { TmdbMovie, TmdbGenre } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PosterCardProps {
  movie: TmdbMovie;
  genres?: TmdbGenre[];
  onPick: (movie: TmdbMovie) => void;
  size?: "normal" | "large";
  index?: number;
}

export function PosterCard({ movie, genres, onPick, size = "normal", index = 0 }: PosterCardProps) {
  const [picked, setPicked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const movieGenres = genres
    ? movie.genre_ids.map((id) => genres.find((g) => g.id === id)?.name).filter(Boolean)
    : [];

  const handlePick = () => {
    setPicked(true);
    setTimeout(() => onPick(movie), 400);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const year = movie.release_date?.slice(0, 4);
  const synopsis = movie.overview?.length > 120
    ? movie.overview.slice(0, 120) + "..."
    : movie.overview;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.3, ease: "easeOut" }}
      className={cn(
        "group relative flex flex-col",
        size === "large" ? "w-44 md:w-52" : "w-32 md:w-40",
      )}
    >
      {/* Main poster button */}
      <button
        onClick={handlePick}
        className={cn(
          "relative overflow-hidden rounded-lg transition-all duration-300",
          "border border-transparent",
          "hover:border-[var(--color-neon-cyan)] hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]",
          "focus-visible:outline-none focus-visible:border-[var(--color-neon-pink)]",
          "active:scale-95",
          picked && "border-[var(--color-neon-pink)] neon-glow-pink scale-105",
        )}
      >
        <div className={cn(
          "relative w-full overflow-hidden rounded-lg bg-muted",
          size === "large" ? "aspect-[2/3]" : "aspect-[2/3]",
        )}>
          <Image
            src={posterUrl(movie.poster_path)}
            alt={movie.title}
            fill
            className={cn(
              "object-cover transition-all duration-300",
              "group-hover:brightness-110 group-hover:scale-105",
              picked && "brightness-125 scale-110",
            )}
            sizes={size === "large" ? "(max-width: 768px) 176px, 208px" : "(max-width: 768px) 128px, 160px"}
          />

          {/* Neon corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[var(--color-neon-cyan)] opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[var(--color-neon-cyan)] opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[var(--color-neon-cyan)] opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[var(--color-neon-cyan)] opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Bottom gradient with title */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-10">
            <p className="text-xs font-bold text-white leading-tight line-clamp-2 font-[family-name:var(--font-display)] uppercase tracking-wide">
              {movie.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
              <span className="text-white/60">{year}</span>
              <span className="neon-text-yellow font-bold">{movie.vote_average?.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </button>

      {/* Synopsis below the poster */}
      <p className="mt-1.5 text-[10px] text-muted-foreground leading-tight line-clamp-2 px-0.5">
        {synopsis}
      </p>

      {/* Expand button for more details */}
      <button
        onClick={handleExpand}
        className="mt-1 text-[9px] uppercase tracking-widest text-[var(--color-neon-cyan)] hover:text-[var(--color-neon-pink)] transition-colors font-bold px-0.5"
      >
        {expanded ? "LESS" : "MORE INFO"}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 p-2 rounded glass text-[10px] space-y-1.5">
              {/* Genres */}
              {movieGenres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {movieGenres.map((g) => (
                    <span
                      key={g}
                      className="px-1.5 py-0.5 rounded-sm bg-[var(--color-neon-purple)]/10 text-[var(--color-neon-purple)] border border-[var(--color-neon-purple)]/30 text-[8px] uppercase tracking-wider"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Ratings */}
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-muted-foreground">TMDB </span>
                  <span className="neon-text-yellow font-bold">{movie.vote_average?.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">VOTES </span>
                  <span className="text-foreground/80">{movie.vote_count?.toLocaleString()}</span>
                </div>
              </div>

              {/* Full synopsis */}
              <p className="text-muted-foreground leading-relaxed">
                {movie.overview}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
