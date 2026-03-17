"use client";

import { motion } from "framer-motion";
import type { TmdbMovie, TmdbGenre, TournamentState } from "@/lib/types";
import { PosterCard } from "./poster-card";
import { VerticalBracket } from "./vertical-bracket";
import { getTournamentCopyName } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface TournamentRoundProps {
  movies: [TmdbMovie, TmdbMovie];
  tournament: TournamentState;
  allMovies: TmdbMovie[];
  genres: TmdbGenre[];
  onPick: (movie: TmdbMovie) => void;
}

export function TournamentRound({ movies, tournament, allMovies, genres, onPick }: TournamentRoundProps) {
  const currentRoundMovies = tournament.currentBracketRound === 0
    ? tournament.entrants
    : tournament.bracketRounds[tournament.currentBracketRound - 1];
  const movieCount = currentRoundMovies?.length ?? 0;
  const roundName = getTournamentCopyName(movieCount);
  const matchupNum = tournament.currentMatchup + 1;
  const totalMatchups = Math.floor(movieCount / 2);
  const isFinal = movieCount === 2;

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full flex-1">
      {/* Round header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <p className={cn(
          "text-sm uppercase tracking-widest font-bold font-[family-name:var(--font-display)]",
          isFinal ? "gradient-text-orange text-lg" : "gradient-text-purple",
        )}>
          {roundName}
        </p>
        {totalMatchups > 1 && (
          <p className="text-xs text-muted-foreground mt-1">
            Match {matchupNum} of {totalMatchups}
          </p>
        )}
      </motion.div>

      {/* VS display */}
      <div className="flex items-center gap-4 md:gap-6">
        <PosterCard movie={movies[0]} genres={genres} onPick={onPick} size="normal" index={0} />

        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="flex flex-col items-center"
        >
          <span className={cn(
            "text-3xl md:text-4xl font-black font-[family-name:var(--font-display)]",
            isFinal ? "gradient-text-orange" : "gradient-text-pink",
          )}>
            VS
          </span>
        </motion.div>

        <PosterCard movie={movies[1]} genres={genres} onPick={onPick} size="normal" index={1} />
      </div>

      {/* Vertical bracket */}
      <VerticalBracket tournament={tournament} allMovies={allMovies} />
    </div>
  );
}
