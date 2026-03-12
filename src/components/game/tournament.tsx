"use client";

import type { TmdbMovie, TournamentState } from "@/lib/types";
import { PosterCard } from "./poster-card";
import { getTournamentRoundName } from "@/lib/engine/game-flow";
import { cn } from "@/lib/utils";

interface TournamentRoundProps {
  movies: [TmdbMovie, TmdbMovie];
  tournament: TournamentState;
  onPick: (movie: TmdbMovie) => void;
}

export function TournamentRound({ movies, tournament, onPick }: TournamentRoundProps) {
  const roundName = getTournamentRoundName(tournament);
  const matchupNum = tournament.currentMatchup + 1;
  const currentRoundMovies = tournament.currentBracketRound === 0
    ? tournament.entrants
    : tournament.bracketRounds[tournament.currentBracketRound - 1];
  const totalMatchups = Math.floor((currentRoundMovies?.length ?? 0) / 2);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Round header */}
      <div className="text-center">
        <p className={cn(
          "text-xs uppercase tracking-widest font-bold",
          roundName === "The Final" ? "text-yellow-500" : "text-primary",
        )}>
          {roundName}
        </p>
        {totalMatchups > 1 && (
          <p className="text-xs text-muted-foreground mt-1">
            Match {matchupNum} of {totalMatchups}
          </p>
        )}
      </div>

      {/* VS display */}
      <div className="flex items-center gap-4 md:gap-8">
        <PosterCard movie={movies[0]} onPick={onPick} size="large" />

        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-black text-muted-foreground/50">VS</span>
        </div>

        <PosterCard movie={movies[1]} onPick={onPick} size="large" />
      </div>

      {/* Mini bracket visualization */}
      <div className="flex gap-2 mt-2">
        {tournament.entrants.map((id) => {
          const isEliminated = tournament.bracketRounds.flat().indexOf(id) === -1 &&
            tournament.bracketRounds.length > 0 &&
            !currentRoundMovies?.includes(id);
          const isInCurrentMatch = movies.some((m) => m.id === id);

          return (
            <div
              key={id}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-300",
                isEliminated ? "bg-muted-foreground/20" :
                isInCurrentMatch ? "bg-primary scale-125" :
                "bg-primary/50",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
