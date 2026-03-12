import type { MovieProfile, TmdbMovie, TmdbPersonWithMovies, TmdbGenre } from "@/lib/types";
import { genreIdsToNames } from "@/lib/tmdb/client";

export function createEmptyProfile(): MovieProfile {
  return {
    genreWeights: {},
    moodScores: {},
    eraPreference: {},
    peoplePreferences: { actors: {}, directors: {} },
    picks: [],
  };
}

/** Normalize a weight map so values sum to 1 (or stay empty) */
function normalize(weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights);
  if (entries.length === 0) return weights;

  // Clamp negatives to 0
  const clamped = entries.map(([k, v]) => [k, Math.max(0, v)] as const);
  const total = clamped.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return Object.fromEntries(clamped);

  return Object.fromEntries(clamped.map(([k, v]) => [k, v / total]));
}

/** Get the decade bucket for a release date */
function getEra(releaseDate: string): string {
  const year = parseInt(releaseDate?.slice(0, 4));
  if (isNaN(year)) return "unknown";
  if (year >= 2020) return "2020s";
  if (year >= 2010) return "2010s";
  if (year >= 2000) return "2000s";
  if (year >= 1990) return "1990s";
  if (year >= 1980) return "1980s";
  return "pre-1980";
}

/** Update profile after a movie pick */
export function updateProfileWithMovie(
  profile: MovieProfile,
  picked: TmdbMovie,
  rejected: TmdbMovie[],
  genres: TmdbGenre[],
  round: number,
): MovieProfile {
  const next = structuredClone(profile);

  // Boost picked movie's genres
  const pickedGenres = genreIdsToNames(picked.genre_ids, genres);
  for (const genre of pickedGenres) {
    next.genreWeights[genre] = (next.genreWeights[genre] ?? 0) + 0.15;
  }

  // Dampen rejected movies' unique genres
  const pickedGenreSet = new Set(pickedGenres);
  for (const movie of rejected) {
    const rejectedGenres = genreIdsToNames(movie.genre_ids, genres);
    for (const genre of rejectedGenres) {
      if (!pickedGenreSet.has(genre)) {
        next.genreWeights[genre] = (next.genreWeights[genre] ?? 0) - 0.05;
      }
    }
  }

  // Era preference
  const era = getEra(picked.release_date);
  next.eraPreference[era] = (next.eraPreference[era] ?? 0) + 0.1;

  // Record pick
  next.picks.push({
    movieId: picked.id,
    roundType: "poster-pick",
    round,
    alternatives: rejected.map((m) => m.id),
  });

  // Normalize
  next.genreWeights = normalize(next.genreWeights);
  next.eraPreference = normalize(next.eraPreference);

  return next;
}

/** Update profile after an actor or director pick */
export function updateProfileWithPerson(
  profile: MovieProfile,
  picked: TmdbPersonWithMovies,
  rejected: TmdbPersonWithMovies[],
  roundType: "actor-pick" | "director-pick",
  genres: TmdbGenre[],
  round: number,
): MovieProfile {
  const next = structuredClone(profile);
  const isActor = roundType === "actor-pick";

  // Boost selected person
  const peopleMap = isActor ? next.peoplePreferences.actors : next.peoplePreferences.directors;
  peopleMap[picked.id] = (peopleMap[picked.id] ?? 0) + 0.2;

  // Their movies' genres get a small boost
  for (const movie of picked.topMovies) {
    const movieGenres = genreIdsToNames(movie.genre_ids, genres);
    for (const genre of movieGenres) {
      next.genreWeights[genre] = (next.genreWeights[genre] ?? 0) + 0.05;
    }
  }

  // Dampen rejected people
  for (const person of rejected) {
    peopleMap[person.id] = (peopleMap[person.id] ?? 0) - 0.05;
  }

  // Record pick
  next.picks.push({
    personId: picked.id,
    roundType,
    round,
    alternatives: rejected.map((p) => p.id),
  });

  // Normalize
  next.genreWeights = normalize(next.genreWeights);

  return next;
}

/** Update profile after a tournament pick (lighter touch — just record) */
export function updateProfileWithTournamentPick(
  profile: MovieProfile,
  picked: TmdbMovie,
  rejected: TmdbMovie,
  genres: TmdbGenre[],
  round: number,
): MovieProfile {
  const next = structuredClone(profile);

  // Lighter boost for tournament since profile is already well-formed
  const pickedGenres = genreIdsToNames(picked.genre_ids, genres);
  for (const genre of pickedGenres) {
    next.genreWeights[genre] = (next.genreWeights[genre] ?? 0) + 0.05;
  }

  next.picks.push({
    movieId: picked.id,
    roundType: "tournament",
    round,
    alternatives: [rejected.id],
  });

  next.genreWeights = normalize(next.genreWeights);
  return next;
}

/** Get the top N genres from the profile */
export function topGenres(profile: MovieProfile, n = 3): string[] {
  return Object.entries(profile.genreWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name]) => name);
}

/** Get the top era preference */
export function topEra(profile: MovieProfile): string | null {
  const entries = Object.entries(profile.eraPreference);
  if (entries.length === 0) return null;
  return entries.sort(([, a], [, b]) => b - a)[0][0];
}
