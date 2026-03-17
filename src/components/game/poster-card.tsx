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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: "easeOut" }}
      className={cn(
        "group relative flex flex-col",
        size === "large" ? "w-44 md:w-56" : "w-36 md:w-44",
      )}
    >
      {/* Poster button */}
      <button
        onClick={handlePick}
        className={cn(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          "ring-2 ring-transparent",
          "hover:ring-[var(--color-pop-pink)] hover:shadow-lg hover:shadow-[var(--color-pop-pink)]/20",
          "hover:-translate-y-1",
          "focus-visible:outline-none focus-visible:ring-[var(--color-pop-purple)]",
          "active:scale-[0.97]",
          picked && "ring-[var(--color-pop-green)] shadow-lg shadow-[var(--color-pop-green)]/30 scale-105",
        )}
      >
        <div className="relative w-full aspect-[2/3] overflow-hidden rounded-2xl bg-secondary">
          <Image
            src={posterUrl(movie.poster_path)}
            alt={movie.title}
            fill
            className={cn(
              "object-cover transition-all duration-300",
              "group-hover:scale-105",
              picked && "scale-110 brightness-110",
            )}
            sizes={size === "large" ? "(max-width: 768px) 176px, 224px" : "(max-width: 768px) 144px, 176px"}
          />
        </div>
      </button>

      {/* Movie info below poster — title + year only */}
      <div className="mt-2 px-1">
        <h3 className="text-xs font-bold leading-tight line-clamp-2 font-[family-name:var(--font-display)]">
          {movie.title}
        </h3>
        <span className="text-[11px] text-muted-foreground">{year}</span>
      </div>

      {/* Expand toggle */}
      <button
        onClick={handleExpand}
        className="mt-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-pop-purple)] hover:text-[var(--color-pop-pink)] transition-colors"
      >
        {expanded ? "Less" : "More info"}
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
            <div className="mt-1 p-2 rounded-xl bg-secondary text-xs space-y-1.5">
              {/* Genres */}
              {movieGenres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {movieGenres.map((g) => (
                    <span
                      key={g}
                      className="px-1.5 py-0.5 rounded-full bg-[var(--color-pop-purple)]/15 text-[var(--color-pop-purple)] text-[10px] font-semibold"
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
                  <span className="font-bold text-[var(--color-pop-yellow)]">{movie.vote_average?.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">VOTES </span>
                  <span className="text-foreground/80">{movie.vote_count?.toLocaleString()}</span>
                </div>
              </div>

              {/* Synopsis */}
              <p className="text-muted-foreground leading-relaxed line-clamp-3">
                {movie.overview}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
