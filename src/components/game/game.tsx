"use client";

import { useGame } from "@/hooks/use-game";
import { getCurrentRoundType } from "@/lib/engine/game-flow";
import { PosterCard } from "./poster-card";
import { PersonCard } from "./person-card";
import { TournamentRound } from "./tournament";
import { DebugPanel } from "./debug-panel";
import { WinnerScreen } from "./winner-screen";
import { RoundHeader } from "./round-header";
import { ReloadButton } from "./reload-button";
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
    reloadRound,
    restart,
    tournamentMovies,
  } = useGame();

  const roundType = getCurrentRoundType(state);

  return (
    <div className="relative min-h-screen scanline-overlay">
      {/* Debug panel */}
      <DebugPanel
        profile={state.profile}
        genres={genres}
        round={state.currentRound}
        phase={state.phase}
      />

      {/* Main game area */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 pr-10">
        {/* Winner screen */}
        {state.phase === "winner" && (winnerMovie || state.winnerMovieId) ? (
          <WinnerScreen
            movie={winnerMovie ?? tournamentMovies.find((m) => m.id === state.winnerMovieId)!}
            onRestart={restart}
          />
        ) : loading ? (
          <GameLoading />
        ) : roundOptions ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
            {/* Round header */}
            <RoundHeader
              roundType={roundType}
              roundNumber={state.currentRound}
              totalRounds={state.roundSequence.length}
            />

            {/* Round content */}
            {roundOptions.type === "poster-pick" && (
              <div className="flex flex-wrap items-start justify-center gap-3 md:gap-4">
                {roundOptions.movies.map((movie, i) => (
                  <PosterCard
                    key={movie.id}
                    movie={movie}
                    genres={genres}
                    onPick={pickMovie}
                    index={i}
                  />
                ))}
              </div>
            )}

            {roundOptions.type === "actor-pick" && (
              <div className="flex flex-wrap items-start justify-center gap-3 md:gap-4">
                {roundOptions.people.map((person, i) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    onPick={pickPerson}
                    label="ACTOR"
                    index={i}
                  />
                ))}
              </div>
            )}

            {roundOptions.type === "director-pick" && (
              <div className="flex flex-wrap items-start justify-center gap-3 md:gap-4">
                {roundOptions.people.map((person, i) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    onPick={pickPerson}
                    label="DIRECTOR"
                    index={i}
                  />
                ))}
              </div>
            )}

            {roundOptions.type === "tournament" && state.tournament && (
              <TournamentRound
                movies={roundOptions.movies as [TmdbMovie, TmdbMovie]}
                tournament={state.tournament}
                genres={genres}
                onPick={pickTournamentWinner}
              />
            )}

            {/* Reload button (not during tournament) */}
            {roundOptions.type !== "tournament" && (
              <ReloadButton onReload={reloadRound} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
