"use client";

import { useGame } from "@/hooks/use-game";
import { getCurrentRoundType } from "@/lib/engine/game-flow";
import { PosterCard } from "./poster-card";
import { PersonCard } from "./person-card";
import { TournamentRound } from "./tournament";
import { DebugPanel } from "./debug-panel";
import { WinnerScreen } from "./winner-screen";
import { RoundHeader } from "./round-header";
import { GameLoading } from "./loading";
import type { TmdbMovie } from "@/lib/types";

export function Game() {
  const {
    state,
    roundOptions,
    loading,
    winnerMovie,
    genres,
    pickMovie,
    pickPerson,
    pickTournamentWinner,
    restart,
    tournamentMovies,
  } = useGame();

  const roundType = getCurrentRoundType(state);

  return (
    <div className="relative min-h-screen">
      {/* Debug panel */}
      <DebugPanel
        profile={state.profile}
        genres={genres}
        round={state.currentRound}
        phase={state.phase}
      />

      {/* Main game area */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 pr-12">
        {/* Winner screen */}
        {state.phase === "winner" && (winnerMovie || state.winnerMovieId) ? (
          <WinnerScreen
            movie={winnerMovie ?? tournamentMovies.find((m) => m.id === state.winnerMovieId)!}
            onRestart={restart}
          />
        ) : loading ? (
          <GameLoading />
        ) : roundOptions ? (
          <div className="flex flex-col items-center gap-8 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Round header */}
            <RoundHeader
              roundType={roundType}
              roundNumber={state.currentRound}
              totalRounds={state.roundSequence.length}
            />

            {/* Round content */}
            {roundOptions.type === "poster-pick" && (
              <div className="flex items-center justify-center gap-4 md:gap-6">
                {roundOptions.movies.map((movie) => (
                  <PosterCard
                    key={movie.id}
                    movie={movie}
                    onPick={pickMovie}
                  />
                ))}
              </div>
            )}

            {roundOptions.type === "actor-pick" && (
              <div className="flex flex-wrap items-start justify-center gap-4 md:gap-6">
                {roundOptions.people.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    onPick={pickPerson}
                    label="Actor"
                  />
                ))}
              </div>
            )}

            {roundOptions.type === "director-pick" && (
              <div className="flex flex-wrap items-start justify-center gap-4 md:gap-6">
                {roundOptions.people.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    onPick={pickPerson}
                    label="Director"
                  />
                ))}
              </div>
            )}

            {roundOptions.type === "tournament" && state.tournament && (
              <TournamentRound
                movies={roundOptions.movies as [TmdbMovie, TmdbMovie]}
                tournament={state.tournament}
                onPick={pickTournamentWinner}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
