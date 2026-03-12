"use client";

import { useState } from "react";
import Image from "next/image";
import { posterUrl } from "@/lib/tmdb/client";
import type { TmdbMovie } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PosterCardProps {
  movie: TmdbMovie;
  onPick: (movie: TmdbMovie) => void;
  size?: "normal" | "large";
  showTitle?: boolean;
}

export function PosterCard({ movie, onPick, size = "normal", showTitle = true }: PosterCardProps) {
  const [picked, setPicked] = useState(false);

  const handleClick = () => {
    setPicked(true);
    setTimeout(() => onPick(movie), 300);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group relative overflow-hidden rounded-xl transition-all duration-300",
        "hover:scale-105 hover:shadow-2xl hover:shadow-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "active:scale-95",
        picked && "scale-110 ring-4 ring-primary shadow-2xl shadow-primary/40",
        size === "large" ? "w-48 md:w-56" : "w-36 md:w-44",
      )}
    >
      <div className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted",
      )}>
        <Image
          src={posterUrl(movie.poster_path)}
          alt={movie.title}
          fill
          className={cn(
            "object-cover transition-all duration-300",
            "group-hover:brightness-110",
            picked && "brightness-125",
          )}
          sizes={size === "large" ? "(max-width: 768px) 192px, 224px" : "(max-width: 768px) 144px, 176px"}
        />
        {/* Gradient overlay for title */}
        {showTitle && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
            <p className="text-sm font-semibold text-white leading-tight line-clamp-2">
              {movie.title}
            </p>
            <p className="text-xs text-white/60 mt-0.5">
              {movie.release_date?.slice(0, 4)} · ★ {movie.vote_average?.toFixed(1)}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}
