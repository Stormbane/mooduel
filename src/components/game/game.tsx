"use client";

import { useState } from "react";
import { useGame } from "@/hooks/use-game";
import { getCurrentRoundType } from "@/lib/engine/game-flow";
import { PosterCard } from "./poster-card";
import { ColorCard } from "./color-card";
import { VibeCard } from "./vibe-card";
import { EmotionCardComponent } from "./emotion-card";
import { TournamentRound } from "./tournament";
import { DebugPanel } from "./debug-panel";
import { WinnerScreen } from "./winner-screen";
import { RoundHeader } from "./round-header";
import { ReloadButton } from "./reload-button";
import { GameLoading } from "./loading";
import { SplashScreen } from "../splash-screen";
import type { TmdbMovie } from "@/lib/types";

export function Game() {
  const [started, setStarted] = useState(false);
  const {
    state,
    roundOptions,
    loading,
    winnerMovie,
    genres,
    pickMovie,
    pickTournamentWinner,
    pickColor,
    pickVibe,
    pickEmotion,
    reloadRound,
    restart,
    tournamentMovies,
  } = useGame();

  const roundType = getCurrentRoundType(state);

  if (!started) {
    return <SplashScreen onPlay={() => setStarted(true)} />;
  }

  return (
    <div className="relative h-[100dvh]">
      {/* Debug panel */}
      <DebugPanel
        profile={state.profile}
        round={state.currentRound}
        phase={state.phase}
      />

      {/* Main game area */}
      <div className="flex h-[100dvh] flex-col items-center px-4 py-6 pr-12 overflow-y-auto">
        {/* Winner screen */}
        {state.phase === "winner" && (winnerMovie || state.winnerMovieId) ? (
          <WinnerScreen
            movie={winnerMovie ?? tournamentMovies.find((m) => m.id === state.winnerMovieId)!}
            tournament={state.tournament}
            allMovies={tournamentMovies}
            onRestart={restart}
          />
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center w-full">
            <GameLoading />
          </div>
        ) : roundOptions ? (
          <div data-testid="game-area" className="flex flex-col items-center justify-center flex-1 gap-4 w-full max-w-5xl">
            {/* Round header (tournament has its own) */}
            {roundType !== "tournament" && (
              <RoundHeader
                roundType={roundType}
                roundNumber={state.currentRound}
                totalRounds={state.roundSequence.length}
              />
            )}

            {/* Round content */}
            {roundOptions.type === "color-pick" && (
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-5">
                {roundOptions.swatches.map((swatch, i) => (
                  <ColorCard
                    key={swatch.id}
                    swatch={swatch}
                    onPick={pickColor}
                    index={i}
                  />
                ))}
              </div>
            )}

            {roundOptions.type === "vibe-pick" && (
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-5">
                {roundOptions.swatches.map((swatch, i) => (
                  <VibeCard
                    key={swatch.id}
                    swatch={swatch}
                    onPick={pickVibe}
                    index={i}
                  />
                ))}
              </div>
            )}

            {roundOptions.type === "emotion-pick" && (
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-5">
                {roundOptions.cards.map((card, i) => (
                  <EmotionCardComponent
                    key={card.id}
                    card={card}
                    onPick={pickEmotion}
                    index={i}
                  />
                ))}
              </div>
            )}

            {roundOptions.type === "poster-pick" && (
              <div className="flex flex-wrap items-start justify-center gap-4 md:gap-5">
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

            {roundOptions.type === "tournament" && state.tournament && (
              <TournamentRound
                movies={roundOptions.movies as [TmdbMovie, TmdbMovie]}
                tournament={state.tournament}
                allMovies={tournamentMovies}
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
