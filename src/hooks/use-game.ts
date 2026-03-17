"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  GameState,
  TmdbMovie,
  TmdbGenre,
  TmdbMovieDetails,
  RoundOptions,
  ColorSwatch,
  VibeSwatch,
  EmotionCard,
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
  updateProfileWithTournamentPick,
  updateProfileWithColor,
  updateProfileWithVibe,
  updateProfileWithEmotion,
} from "@/lib/engine/profile";
import {
  selectPosterCandidates,
  selectTournamentCandidates,
} from "@/lib/engine/candidates";
import {
  generateColorSwatches,
  selectEmotionCards,
  GENRE_VA,
} from "@/lib/engine/mood";

interface UseGameReturn {
  state: GameState;
  roundOptions: RoundOptions | null;
  loading: boolean;
  winnerMovie: TmdbMovieDetails | null;
  genres: TmdbGenre[];
  pickMovie: (movie: TmdbMovie) => void;
  pickTournamentWinner: (movie: TmdbMovie) => void;
  pickColor: (swatch: ColorSwatch) => void;
  pickVibe: (swatch: VibeSwatch) => void;
  pickEmotion: (card: EmotionCard) => void;
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
  const shownPaintingUrls = useRef<Set<string>>(new Set());
  const shownEmotionIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const paintingsCache = useRef<VibeSwatch[] | null>(null);

  // Fetch genres on mount
  useEffect(() => {
    fetch("/api/tmdb/genres")
      .then((r) => r.json())
      .then(setGenres)
      .catch(console.error);
  }, []);

  // Initialize: show color-pick immediately, fetch movie pool in background
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Round 0 is color-pick — no TMDB calls needed, instant
    setRoundOptions({ type: "color-pick", swatches: generateColorSwatches() });
    setLoading(false);

    // Fetch paintings for vibe round in background
    fetch("/api/paintings")
      .then((r) => r.json())
      .then((paintings: VibeSwatch[]) => {
        if (Array.isArray(paintings) && paintings.length > 0) {
          paintingsCache.current = paintings;
        }
      })
      .catch(console.error);

    // Fetch movie pool and genres in background so they're ready by round 3
    async function prefetchMoviePool() {
      try {
        const randPage = () => Math.ceil(Math.random() * 10);
        const popPages = [randPage(), randPage(), randPage()];
        const topPages = [randPage(), randPage()];

        const [pop1, pop2, pop3, top1, top2, trending, nowPlaying, genreData] = await Promise.all([
          fetch(`/api/tmdb/popular?page=${popPages[0]}`).then((r) => r.json()),
          fetch(`/api/tmdb/popular?page=${popPages[1]}`).then((r) => r.json()),
          fetch(`/api/tmdb/popular?page=${popPages[2]}`).then((r) => r.json()),
          fetch(`/api/tmdb/top-rated?page=${topPages[0]}`).then((r) => r.json()),
          fetch(`/api/tmdb/top-rated?page=${topPages[1]}`).then((r) => r.json()),
          fetch("/api/tmdb/trending").then((r) => r.json()).catch(() => []),
          fetch(`/api/tmdb/now-playing?page=${Math.ceil(Math.random() * 3)}`).then((r) => r.json()).catch(() => []),
          fetch("/api/tmdb/genres").then((r) => r.json()),
        ]);

        const allMovies: TmdbMovie[] = dedupeMovies([
          ...pop1, ...pop2, ...pop3, ...top1, ...top2,
          ...(Array.isArray(trending) ? trending : []),
          ...(Array.isArray(nowPlaying) ? nowPlaying : []),
        ]);
        setMoviePool(allMovies);
        setGenres(genreData);
      } catch (err) {
        console.error("Failed to prefetch movie pool:", err);
      }
    }

    prefetchMoviePool();
  }, []);

  const loadNextRound = useCallback(
    async (nextState: GameState) => {
      setLoading(true);
      const roundType = getCurrentRoundType(nextState);

      try {
        // Mood detection rounds are synchronous — no TMDB calls
        if (roundType === "color-pick") {
          setRoundOptions({ type: "color-pick", swatches: generateColorSwatches() });
          setLoading(false);
          return;
        }
        if (roundType === "vibe-pick") {
          // Always fetch fresh paintings (API returns random picks from pool)
          try {
            const res = await fetch("/api/paintings");
            const paintings: VibeSwatch[] = await res.json();
            if (Array.isArray(paintings) && paintings.length > 0) {
              // Filter out previously shown paintings
              const fresh = paintings.filter((p) => !shownPaintingUrls.current.has(p.imageUrl));
              const toShow = fresh.length >= 5 ? fresh : paintings;
              toShow.forEach((p) => shownPaintingUrls.current.add(p.imageUrl));
              paintingsCache.current = toShow;
              setRoundOptions({ type: "vibe-pick", swatches: toShow });
            }
          } catch {
            // Use cached paintings as fallback
            if (paintingsCache.current && paintingsCache.current.length > 0) {
              setRoundOptions({ type: "vibe-pick", swatches: paintingsCache.current });
            }
          }
          setLoading(false);
          return;
        }
        if (roundType === "emotion-pick") {
          const currentVA = {
            valence: nextState.profile.moodScores.valence ?? 0,
            arousal: nextState.profile.moodScores.arousal ?? 0,
          };
          const cards = selectEmotionCards(currentVA, 5, shownEmotionIds.current);
          cards.forEach((c) => shownEmotionIds.current.add(c.id));
          setRoundOptions({ type: "emotion-pick", cards });
          setLoading(false);
          return;
        }

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

  const pickColor = useCallback(
    (swatch: ColorSwatch) => {
      if (!roundOptions || roundOptions.type !== "color-pick") return;
      const updatedProfile = updateProfileWithColor(state.profile, swatch);
      const nextState = advanceRound({ ...state, profile: updatedProfile });
      setState(nextState);
      loadNextRound(nextState);
    },
    [state, roundOptions, loadNextRound]
  );

  const pickVibe = useCallback(
    (swatch: VibeSwatch) => {
      if (!roundOptions || roundOptions.type !== "vibe-pick") return;
      const updatedProfile = updateProfileWithVibe(state.profile, swatch);
      const nextState = advanceRound({ ...state, profile: updatedProfile });
      setState(nextState);
      loadNextRound(nextState);
    },
    [state, roundOptions, loadNextRound]
  );

  const pickEmotion = useCallback(
    (card: EmotionCard) => {
      if (!roundOptions || roundOptions.type !== "emotion-pick") return;
      const updatedProfile = updateProfileWithEmotion(state.profile, card, GENRE_VA);
      const nextState = advanceRound({ ...state, profile: updatedProfile });
      setState(nextState);
      loadNextRound(nextState);
    },
    [state, roundOptions, loadNextRound]
  );

  /** Reload the current round with fresh candidates.
   *  Treat as a mood-shift signal: dampen VA toward neutral by 20%. */
  const reloadRound = useCallback(() => {
    const dampened = structuredClone(state);
    const v = dampened.profile.moodScores.valence;
    const a = dampened.profile.moodScores.arousal;
    if (v !== undefined) dampened.profile.moodScores.valence = v * 0.8;
    if (a !== undefined) dampened.profile.moodScores.arousal = a * 0.8;
    setState(dampened);

    loadNextRound(dampened);
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
    pickTournamentWinner,
    pickColor,
    pickVibe,
    pickEmotion,
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
