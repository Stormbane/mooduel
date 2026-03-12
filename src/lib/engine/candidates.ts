import type { MovieProfile, TmdbMovie, TmdbGenre } from "@/lib/types";
import { topGenres } from "./profile";

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

  return score;
}

/**
 * Select candidates for a poster-pick round.
 * Returns 3 movies: 2 that match the profile + 1 exploration pick.
 */
export function selectPosterCandidates(
  allMovies: TmdbMovie[],
  profile: MovieProfile,
  genres: TmdbGenre[],
  alreadyPicked: Set<number>,
): TmdbMovie[] {
  // Filter out already picked/shown movies
  const available = allMovies.filter(
    (m) => !alreadyPicked.has(m.id) && m.poster_path
  );

  if (available.length < 3) return available;

  // Score and sort
  const scored = available.map((m) => ({
    movie: m,
    score: scoreMovie(m, profile, genres),
  }));
  scored.sort((a, b) => b.score - a.score);

  // Top 2 matches
  const matches = scored.slice(0, 2).map((s) => s.movie);

  // 1 exploration pick from the bottom half
  const bottomHalf = scored.slice(Math.floor(scored.length / 2));
  const exploration = bottomHalf[Math.floor(Math.random() * bottomHalf.length)]?.movie;

  if (exploration && !matches.some((m) => m.id === exploration.id)) {
    matches.push(exploration);
  } else {
    // Fallback: just take the 3rd best
    const third = scored[2]?.movie;
    if (third) matches.push(third);
  }

  // Shuffle so the "best" option isn't always first
  return shuffleArray(matches);
}

/**
 * Select 8 tournament candidates from the profile's best matches.
 */
export function selectTournamentCandidates(
  allMovies: TmdbMovie[],
  profile: MovieProfile,
  genres: TmdbGenre[],
  alreadyPicked: Set<number>,
): TmdbMovie[] {
  const available = allMovies.filter(
    (m) => !alreadyPicked.has(m.id) && m.poster_path
  );

  const scored = available.map((m) => ({
    movie: m,
    score: scoreMovie(m, profile, genres),
  }));
  scored.sort((a, b) => b.score - a.score);

  // Take top 8 and shuffle
  return shuffleArray(scored.slice(0, 8).map((s) => s.movie));
}

/**
 * Build TMDB discover params from profile.
 */
export function profileToDiscoverParams(profile: MovieProfile, genres: TmdbGenre[]): Record<string, string> {
  const params: Record<string, string> = {};

  // Use top genres for discovery
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
