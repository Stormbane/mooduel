"use client";

import { motion } from "framer-motion";
import type { TmdbMovie, TmdbGenre, TournamentState } from "@/lib/types";
import { PosterCard } from "./poster-card";
import { getTournamentCopyName } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface TournamentRoundProps {
  movies: [TmdbMovie, TmdbMovie];
  tournament: TournamentState;
  genres: TmdbGenre[];
  onPick: (movie: TmdbMovie) => void;
}

export function TournamentRound({ movies, tournament, genres, onPick }: TournamentRoundProps) {
  const currentRoundMovies = tournament.currentBracketRound === 0
    ? tournament.entrants
    : tournament.bracketRounds[tournament.currentBracketRound - 1];
  const movieCount = currentRoundMovies?.length ?? 0;
  const roundName = getTournamentCopyName(movieCount);
  const matchupNum = tournament.currentMatchup + 1;
  const totalMatchups = Math.floor(movieCount / 2);
  const isFinal = movieCount === 2;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Round header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <p className={cn(
          "text-xs uppercase tracking-[0.3em] font-bold font-[family-name:var(--font-display)]",
          isFinal ? "neon-text-yellow text-base" : "neon-text-pink",
        )}>
          {roundName}
        </p>
        {totalMatchups > 1 && (
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
            Match {matchupNum} of {totalMatchups}
          </p>
        )}
      </motion.div>

      {/* VS display */}
      <div className="flex items-center gap-3 md:gap-6">
        <PosterCard movie={movies[0]} genres={genres} onPick={onPick} size="large" index={0} />

        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="flex flex-col items-center"
        >
          <span className={cn(
            "text-3xl md:text-4xl font-black font-[family-name:var(--font-display)]",
            isFinal ? "neon-text-yellow" : "neon-text-pink",
            "animate-[neon-pulse_2s_ease-in-out_infinite]",
          )}>
            VS
          </span>
        </motion.div>

        <PosterCard movie={movies[1]} genres={genres} onPick={onPick} size="large" index={1} />
      </div>

      {/* Bracket progress dots */}
      <div className="flex gap-1.5 mt-2">
        {tournament.entrants.map((id) => {
          const isEliminated = tournament.bracketRounds.flat().indexOf(id) === -1 &&
            tournament.bracketRounds.length > 0 &&
            !currentRoundMovies?.includes(id);
          const isInCurrentMatch = movies.some((m) => m.id === id);

          return (
            <motion.div
              key={id}
              animate={{
                scale: isInCurrentMatch ? 1.3 : 1,
                opacity: isEliminated ? 0.2 : 1,
              }}
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-300",
                isEliminated ? "bg-muted-foreground/20" :
                isInCurrentMatch ? "bg-[var(--color-neon-pink)]" :
                "bg-[var(--color-neon-cyan)]/50",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
