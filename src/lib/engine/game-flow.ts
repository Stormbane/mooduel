import type { RoundType, GameState, TournamentState } from "@/lib/types";
import { createEmptyProfile } from "./profile";

/**
 * The round sequence before the tournament finale.
 * Rotates through different round types for variety.
 */
const ROUND_SEQUENCE: RoundType[] = [
  "poster-pick",
  "actor-pick",
  "poster-pick",
  "director-pick",
  "poster-pick",
  "poster-pick",
];

const TOTAL_ROUNDS = ROUND_SEQUENCE.length;

export function createInitialGameState(): GameState {
  return {
    currentRound: 0,
    roundSequence: ROUND_SEQUENCE,
    profile: createEmptyProfile(),
    phase: "playing",
    tournament: null,
    winnerMovieId: null,
  };
}

export function getCurrentRoundType(state: GameState): RoundType {
  if (state.phase === "tournament") return "tournament";
  return state.roundSequence[state.currentRound] ?? "poster-pick";
}

export function advanceRound(state: GameState): GameState {
  const nextRound = state.currentRound + 1;

  if (nextRound >= TOTAL_ROUNDS) {
    // Transition to tournament phase
    return {
      ...state,
      currentRound: nextRound,
      phase: "tournament",
    };
  }

  return {
    ...state,
    currentRound: nextRound,
  };
}

export function createTournamentState(movieIds: number[]): TournamentState {
  return {
    entrants: movieIds,
    bracketRounds: [],
    currentMatchup: 0,
    currentBracketRound: 0,
  };
}

/**
 * Get the current tournament matchup (two movie IDs to show).
 * Returns null if tournament is complete.
 */
export function getCurrentMatchup(tournament: TournamentState): [number, number] | null {
  const currentRoundMovies = tournament.currentBracketRound === 0
    ? tournament.entrants
    : tournament.bracketRounds[tournament.currentBracketRound - 1];

  if (!currentRoundMovies || currentRoundMovies.length < 2) return null;

  const matchupIndex = tournament.currentMatchup;
  const i = matchupIndex * 2;

  if (i + 1 >= currentRoundMovies.length) return null;

  return [currentRoundMovies[i], currentRoundMovies[i + 1]];
}

/**
 * Record a tournament pick and advance to next matchup or round.
 */
export function advanceTournament(tournament: TournamentState, winnerId: number): TournamentState {
  const next = structuredClone(tournament);

  // Initialize current bracket round's winners array if needed
  if (!next.bracketRounds[next.currentBracketRound]) {
    next.bracketRounds[next.currentBracketRound] = [];
  }

  // Record winner
  next.bracketRounds[next.currentBracketRound].push(winnerId);

  // Check if this bracket round is complete
  const currentRoundMovies = next.currentBracketRound === 0
    ? next.entrants
    : next.bracketRounds[next.currentBracketRound - 1];

  const totalMatchups = Math.floor(currentRoundMovies.length / 2);

  if (next.currentMatchup + 1 >= totalMatchups) {
    // Move to next bracket round
    next.currentBracketRound++;
    next.currentMatchup = 0;
  } else {
    next.currentMatchup++;
  }

  return next;
}

/**
 * Check if tournament is complete (we have a single winner).
 */
export function isTournamentComplete(tournament: TournamentState): boolean {
  // Tournament is complete when we have a bracket round with exactly 1 winner
  // (the final round)
  const lastRound = tournament.bracketRounds[tournament.bracketRounds.length - 1];
  if (!lastRound) return false;

  // Check if the previous round had exactly 2 movies (meaning this was the final)
  const prevRoundMovies = tournament.currentBracketRound === 1
    ? tournament.entrants
    : tournament.bracketRounds[tournament.currentBracketRound - 2];

  // If current bracket round's source had 2 movies, the single winner is our champion
  if (prevRoundMovies?.length === 2 && lastRound.length === 1) return true;

  // More general check: latest completed round has 1 entry
  return tournament.bracketRounds.some(
    (round, i) => round.length === 1 && i > 0
  );
}

export function getTournamentWinner(tournament: TournamentState): number | null {
  // The winner is in the last bracket round that has exactly 1 entry
  for (let i = tournament.bracketRounds.length - 1; i >= 0; i--) {
    if (tournament.bracketRounds[i].length === 1) {
      return tournament.bracketRounds[i][0];
    }
  }
  return null;
}

export function getTournamentRoundName(tournament: TournamentState): string {
  const currentRoundMovies = tournament.currentBracketRound === 0
    ? tournament.entrants
    : tournament.bracketRounds[tournament.currentBracketRound - 1];

  const count = currentRoundMovies?.length ?? 0;
  if (count === 8) return "Quarter-Finals";
  if (count === 4) return "Semi-Finals";
  if (count === 2) return "The Final";
  return `Round of ${count}`;
}
