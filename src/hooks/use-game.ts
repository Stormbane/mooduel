"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  GameState,
  TmdbMovie,
  TmdbPersonWithMovies,
  TmdbGenre,
  TmdbMovieDetails,
  RoundOptions,
} from "@/lib/types";
import {
  createInitialGameState,
  getCurrentRoundType,
  advanceRound,
  createTournamentState,
  getCurrentMatchup,
  advanceTournament,
  isTournamentComplete,
  getTournamentWinner,
} from "@/lib/engine/game-flow";
import {
  updateProfileWithMovie,
  updateProfileWithPerson,
  updateProfileWithTournamentPick,
} from "@/lib/engine/profile";
import {
  selectPosterCandidates,
  selectTournamentCandidates,
} from "@/lib/engine/candidates";

interface UseGameReturn {
  state: GameState;
  roundOptions: RoundOptions | null;
  loading: boolean;
  winnerMovie: TmdbMovieDetails | null;
  genres: TmdbGenre[];
  pickMovie: (movie: TmdbMovie) => void;
  pickPerson: (person: TmdbPersonWithMovies) => void;
  pickTournamentWinner: (movie: TmdbMovie) => void;
  reloadRound: () => void;
  restart: () => void;
  moviePool: TmdbMovie[];
  tournamentMovies: TmdbMovie[];
}

export function useGame(): UseGameReturn {
  const [state, setState] = useState<GameState>(createInitialGameState);
  const [roundOptions, setRoundOptions] = useState<RoundOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<TmdbGenre[]>([]);
  const [moviePool, setMoviePool] = useState<TmdbMovie[]>([]);
  const [tournamentMovies, setTournamentMovies] = useState<TmdbMovie[]>([]);
  const [winnerMovie, setWinnerMovie] = useState<TmdbMovieDetails | null>(null);
  const shownIds = useRef<Set<number>>(new Set());
  const initialized = useRef(false);

  // Fetch genres on mount
  useEffect(() => {
    fetch("/api/tmdb/genres")
      .then((r) => r.json())
      .then(setGenres)
      .catch(console.error);
  }, []);

  // Fetch initial movie pool and set up first round
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      setLoading(true);
      try {
        // Fetch popular + top rated for a rich initial pool
        const [pop1, pop2, pop3, top1, top2] = await Promise.all([
          fetch("/api/tmdb/popular?page=1").then((r) => r.json()),
          fetch("/api/tmdb/popular?page=2").then((r) => r.json()),
          fetch("/api/tmdb/popular?page=3").then((r) => r.json()),
          fetch("/api/tmdb/top-rated?page=1").then((r) => r.json()),
          fetch("/api/tmdb/top-rated?page=2").then((r) => r.json()),
        ]);

        const allMovies: TmdbMovie[] = dedupeMovies([...pop1, ...pop2, ...pop3, ...top1, ...top2]);
        setMoviePool(allMovies);

        const genreData: TmdbGenre[] = await fetch("/api/tmdb/genres").then((r) => r.json());
        setGenres(genreData);

        // Select first round — 5 candidates, round 0 = famous only
        const candidates = selectPosterCandidates(allMovies, createInitialGameState().profile, genreData, shownIds.current, 0);
        candidates.forEach((m) => shownIds.current.add(m.id));
        setRoundOptions({ type: "poster-pick", movies: candidates });
      } catch (err) {
        console.error("Failed to initialize game:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const loadNextRound = useCallback(
    async (nextState: GameState) => {
      setLoading(true);
      const roundType = getCurrentRoundType(nextState);

      try {
        if (roundType === "poster-pick") {
          let pool = moviePool;

          // Fetch more movies if pool is running low
          if (pool.length - shownIds.current.size < 20) {
            const page = Math.floor(pool.length / 20) + 1;
            const [more1, more2] = await Promise.all([
              fetch(`/api/tmdb/popular?page=${page}`).then((r) => r.json()),
              fetch(`/api/tmdb/popular?page=${page + 1}`).then((r) => r.json()),
            ]);
            pool = dedupeMovies([...pool, ...more1, ...more2]);
            setMoviePool(pool);
          }

          // Discover profile-matched movies after a few picks
          if (nextState.profile.picks.length >= 2 && genres.length > 0) {
            try {
              const topGenreEntries = Object.entries(nextState.profile.genreWeights)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 2);
              if (topGenreEntries.length > 0) {
                const genreIds = topGenreEntries
                  .map(([name]) => genres.find((g) => g.name === name)?.id)
                  .filter(Boolean);
                if (genreIds.length > 0) {
                  const randomPage = Math.ceil(Math.random() * 3);
                  const discovered: TmdbMovie[] = await fetch(
                    `/api/tmdb/discover?with_genres=${genreIds.join(",")}&page=${randomPage}`
                  ).then((r) => r.json());
                  pool = dedupeMovies([...pool, ...discovered]);
                  setMoviePool(pool);
                }
              }
            } catch {
              // Discovery is optional
            }
          }

          const candidates = selectPosterCandidates(pool, nextState.profile, genres, shownIds.current, nextState.currentRound);
          candidates.forEach((m) => shownIds.current.add(m.id));
          setRoundOptions({ type: "poster-pick", movies: candidates });
        } else if (roundType === "actor-pick") {
          const actors: TmdbPersonWithMovies[] = await fetch(
            `/api/tmdb/people?type=actors`
          ).then((r) => r.json());
          setRoundOptions({ type: "actor-pick", people: actors.slice(0, 5) });
        } else if (roundType === "director-pick") {
          const directors: TmdbPersonWithMovies[] = await fetch(
            "/api/tmdb/people?type=directors"
          ).then((r) => r.json());
          setRoundOptions({ type: "director-pick", people: directors.slice(0, 5) });
        } else if (roundType === "tournament") {
          let pool = moviePool;
          if (genres.length > 0) {
            try {
              const topGenreEntries = Object.entries(nextState.profile.genreWeights)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3);
              const genreIds = topGenreEntries
                .map(([name]) => genres.find((g) => g.name === name)?.id)
                .filter(Boolean);
              if (genreIds.length > 0) {
                const [disc1, disc2] = await Promise.all([
                  fetch(`/api/tmdb/discover?with_genres=${genreIds.join(",")}&page=1`).then((r) => r.json()),
                  fetch(`/api/tmdb/discover?with_genres=${genreIds.slice(0, 1).join(",")}&page=2`).then((r) => r.json()),
                ]);
                pool = dedupeMovies([...pool, ...disc1, ...disc2]);
                setMoviePool(pool);
              }
            } catch {
              // Use existing pool
            }
          }

          const candidates = selectTournamentCandidates(pool, nextState.profile, genres, shownIds.current);
          setTournamentMovies(candidates);

          const tournament = createTournamentState(candidates.map((m) => m.id));
          const updatedState = { ...nextState, tournament };
          setState(updatedState);

          const matchup = getCurrentMatchup(tournament);
          if (matchup) {
            const [a, b] = matchup;
            const movieA = candidates.find((m) => m.id === a)!;
            const movieB = candidates.find((m) => m.id === b)!;
            setRoundOptions({ type: "tournament", movies: [movieA, movieB] });
          }
        }
      } catch (err) {
        console.error("Failed to load round:", err);
      } finally {
        setLoading(false);
      }
    },
    [moviePool, genres]
  );

  const pickMovie = useCallback(
    (movie: TmdbMovie) => {
      if (!roundOptions || roundOptions.type !== "poster-pick") return;

      const rejected = roundOptions.movies.filter((m) => m.id !== movie.id);
      const updatedProfile = updateProfileWithMovie(
        state.profile, movie, rejected, genres, state.currentRound,
      );

      const nextState = advanceRound({ ...state, profile: updatedProfile });
      setState(nextState);
      loadNextRound(nextState);
    },
    [state, roundOptions, genres, loadNextRound]
  );

  const pickPerson = useCallback(
    (person: TmdbPersonWithMovies) => {
      if (!roundOptions || (roundOptions.type !== "actor-pick" && roundOptions.type !== "director-pick")) return;

      const rejected = roundOptions.people.filter((p) => p.id !== person.id);
      const updatedProfile = updateProfileWithPerson(
        state.profile, person, rejected, roundOptions.type, genres, state.currentRound,
      );

      const nextState = advanceRound({ ...state, profile: updatedProfile });
      setState(nextState);
      loadNextRound(nextState);
    },
    [state, roundOptions, genres, loadNextRound]
  );

  const pickTournamentWinner = useCallback(
    async (movie: TmdbMovie) => {
      if (!state.tournament || !roundOptions || roundOptions.type !== "tournament") return;

      const matchup = getCurrentMatchup(state.tournament);
      if (!matchup) return;

      const loserId = matchup[0] === movie.id ? matchup[1] : matchup[0];
      const loser = tournamentMovies.find((m) => m.id === loserId)!;

      const updatedProfile = updateProfileWithTournamentPick(
        state.profile, movie, loser, genres, state.currentRound,
      );

      const nextTournament = advanceTournament(state.tournament, movie.id);

      if (isTournamentComplete(nextTournament)) {
        const winnerId = getTournamentWinner(nextTournament);
        try {
          const details: TmdbMovieDetails = await fetch(
            `/api/tmdb/movie?id=${winnerId}`
          ).then((r) => r.json());
          setWinnerMovie(details);
        } catch {
          // Fallback
        }

        setState({
          ...state,
          profile: updatedProfile,
          tournament: nextTournament,
          phase: "winner",
          winnerMovieId: winnerId,
        });
        setRoundOptions(null);
        return;
      }

      const nextMatchup = getCurrentMatchup(nextTournament);
      if (nextMatchup) {
        const [a, b] = nextMatchup;
        const movieA = tournamentMovies.find((m) => m.id === a)!;
        const movieB = tournamentMovies.find((m) => m.id === b)!;
        setRoundOptions({ type: "tournament", movies: [movieA, movieB] });
      }

      setState({
        ...state,
        profile: updatedProfile,
        tournament: nextTournament,
      });
    },
    [state, roundOptions, genres, tournamentMovies]
  );

  /** Reload the current round with fresh candidates (same round type, no profile change) */
  const reloadRound = useCallback(() => {
    loadNextRound(state);
  }, [state, loadNextRound]);

  const restart = useCallback(() => {
    shownIds.current.clear();
    initialized.current = false;
    setState(createInitialGameState());
    setRoundOptions(null);
    setWinnerMovie(null);
    setTournamentMovies([]);
    setLoading(true);
    setTimeout(() => {
      initialized.current = false;
      window.location.reload();
    }, 0);
  }, []);

  return {
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
    moviePool,
    tournamentMovies,
  };
}

function dedupeMovies(movies: TmdbMovie[]): TmdbMovie[] {
  const seen = new Set<number>();
  return movies.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}
