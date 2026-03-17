"use client";

import { useMemo } from "react";
import Image from "next/image";
import { posterUrl } from "@/lib/tmdb/client";
import type { TmdbMovieDetails, TmdbMovie, TournamentState } from "@/lib/types";
import { WINNER_INTROS, getRandomCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface WinnerScreenProps {
  movie: TmdbMovieDetails | TmdbMovie;
  tournament: TournamentState | null;
  allMovies: TmdbMovie[];
  onRestart: () => void;
}

function isMovieDetails(m: TmdbMovieDetails | TmdbMovie): m is TmdbMovieDetails {
  return "genres" in m;
}

export function WinnerScreen({ movie, tournament, allMovies, onRestart }: WinnerScreenProps) {
  const details = isMovieDetails(movie) ? movie : null;
  const intro = useMemo(() => getRandomCopy(WINNER_INTROS), []);

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl mx-auto py-4">
      {/* Intro text */}
      <div className="text-center space-y-1">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--color-pop-green)] font-semibold font-[family-name:var(--font-display)]">
          {intro}
        </p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)] gradient-text-pink">
          {movie.title}
        </h1>
        {details?.tagline && (
          <p className="text-muted-foreground italic text-sm">
            &ldquo;{details.tagline}&rdquo;
          </p>
        )}
      </div>

      {/* Poster + details row */}
      <div className="flex items-start gap-6">
        {/* Poster */}
        <div className="relative w-36 md:w-44 aspect-[2/3] rounded-2xl overflow-hidden ring-4 ring-[var(--color-pop-pink)] shadow-2xl shadow-[var(--color-pop-pink)]/20 shrink-0">
          <Image
            src={posterUrl(movie.poster_path, "w780")}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 144px, 176px"
            priority
          />
        </div>

        {/* Details */}
        <div className="space-y-3 min-w-0">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">{movie.release_date?.slice(0, 4)}</span>
            <span className="font-bold text-[var(--color-pop-yellow)]">{movie.vote_average?.toFixed(1)}</span>
            {details?.runtime && (
              <span className="text-muted-foreground">
                {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
              </span>
            )}
          </div>

          {details?.genres && (
            <div className="flex flex-wrap gap-1.5">
              {details.genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--color-pop-purple)]/15 text-[var(--color-pop-purple)]"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {movie.overview && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
              {movie.overview}
            </p>
          )}
        </div>
      </div>

      {/* Tournament bracket summary */}
      {tournament && (
        <BracketSummary tournament={tournament} allMovies={allMovies} />
      )}

      {/* Play again */}
      <button
        onClick={onRestart}
        className={cn(
          "rounded-full px-8 py-2.5 text-sm font-bold uppercase tracking-wider",
          "font-[family-name:var(--font-display)]",
          "gradient-bg-green text-black",
          "hover:opacity-90 hover:shadow-lg hover:shadow-[var(--color-pop-green)]/30",
          "transition-all active:scale-95",
        )}
      >
        Play Again
      </button>
    </div>
  );
}

/** Simple bracket summary — shows each round's matchups as a compact list */
function BracketSummary({ tournament, allMovies }: { tournament: TournamentState; allMovies: TmdbMovie[] }) {
  const numRounds = Math.ceil(Math.log2(tournament.entrants.length));

  const rounds: { title: string; matchups: { winner: string; loser: string }[] }[] = [];
  for (let r = 0; r < numRounds; r++) {
    const sourceMovies = r === 0 ? tournament.entrants : (tournament.bracketRounds[r - 1] ?? []);
    const winners = tournament.bracketRounds[r] ?? [];

    const title = sourceMovies.length === 8 ? "Quarter-Finals"
      : sourceMovies.length === 4 ? "Semi-Finals"
      : sourceMovies.length === 2 ? "Final"
      : `Round of ${sourceMovies.length}`;

    const matchups = [];
    for (let i = 0; i < sourceMovies.length; i += 2) {
      const idA = sourceMovies[i];
      const idB = sourceMovies[i + 1];
      const matchIdx = Math.floor(i / 2);
      const winnerId = winners[matchIdx];
      const movieA = allMovies.find((m) => m.id === idA);
      const movieB = idB != null ? allMovies.find((m) => m.id === idB) : undefined;

      if (winnerId != null) {
        matchups.push({
          winner: winnerId === idA ? (movieA?.title ?? "?") : (movieB?.title ?? "?"),
          loser: winnerId === idA ? (movieB?.title ?? "?") : (movieA?.title ?? "?"),
        });
      }
    }

    if (matchups.length > 0) {
      rounds.push({ title, matchups });
    }
  }

  return (
    <div className="flex flex-wrap justify-center gap-4 text-[10px]">
      {rounds.map((round) => (
        <div key={round.title} className="space-y-1">
          <p className="font-bold uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-display)]">
            {round.title}
          </p>
          {round.matchups.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[var(--color-pop-green)] font-semibold">{m.winner}</span>
              <span className="text-muted-foreground/50">beat</span>
              <span className="text-muted-foreground line-through">{m.loser}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
