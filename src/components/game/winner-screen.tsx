"use client";

import Image from "next/image";
import { posterUrl } from "@/lib/tmdb/client";
import type { TmdbMovieDetails, TmdbMovie } from "@/lib/types";
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

  return (
    <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Title */}
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold">
          Tonight, watch
        </p>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          {movie.title}
        </h1>
        {details?.tagline && (
          <p className="text-muted-foreground italic text-lg">
            &ldquo;{details.tagline}&rdquo;
          </p>
        )}
      </div>

      {/* Poster */}
      <div className={cn(
        "relative w-64 md:w-80 aspect-[2/3] rounded-2xl overflow-hidden",
        "shadow-2xl shadow-primary/20 ring-2 ring-primary/30",
      )}>
        <Image
          src={posterUrl(movie.poster_path, "w780")}
          alt={movie.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 256px, 320px"
          priority
        />
      </div>

      {/* Details */}
      <div className="max-w-md text-center space-y-3">
        {/* Meta row */}
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <span>{movie.release_date?.slice(0, 4)}</span>
          <span>·</span>
          <span>★ {movie.vote_average?.toFixed(1)}</span>
          {details?.runtime && (
            <>
              <span>·</span>
              <span>{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span>
            </>
          )}
        </div>

        {/* Genres */}
        {details?.genres && (
          <div className="flex flex-wrap justify-center gap-2">
            {details.genres.map((g) => (
              <span
                key={g.id}
                className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium"
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
      </div>

      {/* Play again */}
      <button
        onClick={onRestart}
        className={cn(
          "rounded-full px-8 py-3 text-sm font-semibold",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 transition-colors",
          "active:scale-95",
        )}
      >
        Play Again
      </button>
    </div>
  );
}
