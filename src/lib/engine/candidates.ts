import type { MovieProfile, TmdbMovie, TmdbGenre } from "@/lib/types";
import { topGenres } from "./profile";
import { movieVA, moodDistance } from "./mood";

/**
 * Score a movie against the current profile.
 * Higher score = better match.
 */
export function scoreMovie(movie: TmdbMovie, profile: MovieProfile, genres: TmdbGenre[]): number {
  let score = 0;

  // Genre match
  const movieGenreNames = movie.genre_ids
    .map((id) => genres.find((g) => g.id === id)?.name)
    .filter(Boolean) as string[];

  for (const genre of movieGenreNames) {
    score += (profile.genreWeights[genre] ?? 0) * 10;
  }

  // Era match
  const year = parseInt(movie.release_date?.slice(0, 4));
  if (!isNaN(year)) {
    const era = year >= 2020 ? "2020s" : year >= 2010 ? "2010s" : year >= 2000 ? "2000s" : year >= 1990 ? "1990s" : year >= 1980 ? "1980s" : "pre-1980";
    score += (profile.eraPreference[era] ?? 0) * 3;
  }

  // Small boost for well-rated movies
  score += (movie.vote_average / 10) * 0.5;

  // Mood proximity boost (if mood has been detected)
  const v = profile.moodScores.valence;
  const a = profile.moodScores.arousal;
  if (v !== undefined && a !== undefined) {
    const target = { valence: v, arousal: a };
    const va = movieVA(movie, genres);
    const dist = moodDistance(va, target);
    // Max distance in VA space is ~2.83. Closer = higher boost (up to +3).
    score += 3 * (1 - dist / 2.83);
  }

  return score;
}

/**
 * Popularity threshold decreases as poster-pick rounds progress.
 * Early poster picks = famous movies only. Later = allow fringe picks.
 *
 * The first 3 rounds are mood detection (color, vibe, genre) so
 * poster-pick rounds start at round index 3.
 *
 * Poster-pick round 0 (game round 3): popularity > 50
 * Poster-pick round 2 (game round 5): popularity > 20
 * Poster-pick round 4+: anything goes (popularity > 5)
 */
const MOOD_ROUNDS_OFFSET = 3;

function getPopularityFloor(round: number): number {
  const posterRound = Math.max(0, round - MOOD_ROUNDS_OFFSET);
  if (posterRound <= 1) return 50;
  if (posterRound <= 3) return 20;
  return 5;
}

/**
 * Select 5 candidates for a poster-pick round.
 * Mix of profile matches + exploration picks.
 * Popularity floor decreases each round (famous → fringe).
 */
export function selectPosterCandidates(
  allMovies: TmdbMovie[],
  profile: MovieProfile,
  genres: TmdbGenre[],
  alreadyShown: Set<number>,
  round: number = 0,
): TmdbMovie[] {
  const popFloor = getPopularityFloor(round);

  const available = allMovies.filter(
    (m) => !alreadyShown.has(m.id) && m.poster_path && m.popularity >= popFloor
  );

  if (available.length < 5) {
    // Relax popularity filter if not enough movies
    const relaxed = allMovies.filter(
      (m) => !alreadyShown.has(m.id) && m.poster_path
    );
    return shuffleArray(relaxed).slice(0, 5);
  }

  // If profile has no picks yet, all scores are ~equal — just shuffle randomly
  const hasProfile = profile.picks.length > 0;

  if (!hasProfile) {
    return shuffleArray(available).slice(0, 5);
  }

  // Score and sort
  const scored = available.map((m) => ({
    movie: m,
    score: scoreMovie(m, profile, genres),
  }));
  scored.sort((a, b) => b.score - a.score);

  // Top 3 profile matches (with jitter so ties don't always resolve the same way)
  const topPool = scored.slice(0, Math.min(10, scored.length));
  const matches = shuffleArray(topPool).slice(0, 3).map((s) => s.movie);

  // 2 exploration picks from the rest (avoid top quarter)
  const explorationPool = scored.slice(Math.max(3, Math.floor(scored.length / 4)));
  const explorations = shuffleArray(explorationPool)
    .filter((s) => !matches.some((m) => m.id === s.movie.id))
    .slice(0, 2)
    .map((s) => s.movie);

  const result = [...matches, ...explorations];

  // Fill to 5 if we don't have enough explorations
  while (result.length < 5 && scored.length > result.length) {
    const next = scored.find((s) => !result.some((m) => m.id === s.movie.id));
    if (next) result.push(next.movie);
    else break;
  }

  return shuffleArray(result).slice(0, 5);
}

/**
 * Select 8 tournament candidates from the profile's best matches.
 */
export function selectTournamentCandidates(
  allMovies: TmdbMovie[],
  profile: MovieProfile,
  genres: TmdbGenre[],
  alreadyShown: Set<number>,
): TmdbMovie[] {
  const available = allMovies.filter(
    (m) => !alreadyShown.has(m.id) && m.poster_path
  );

  const scored = available.map((m) => ({
    movie: m,
    score: scoreMovie(m, profile, genres),
  }));
  scored.sort((a, b) => b.score - a.score);

  return shuffleArray(scored.slice(0, 8).map((s) => s.movie));
}

/**
 * Build TMDB discover params from profile.
 */
export function profileToDiscoverParams(profile: MovieProfile, genres: TmdbGenre[]): Record<string, string> {
  const params: Record<string, string> = {};

  const top = topGenres(profile, 2);
  if (top.length > 0) {
    const genreIds = top
      .map((name) => genres.find((g) => g.name === name)?.id)
      .filter(Boolean);
    if (genreIds.length > 0) {
      params.with_genres = genreIds.join(",");
    }
  }

  return params;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
