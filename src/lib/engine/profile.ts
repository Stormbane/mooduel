import type { MovieProfile, TmdbMovie, TmdbGenre, ColorSwatch, VibeSwatch, EmotionCard } from "@/lib/types";
import { genreIdsToNames } from "@/lib/tmdb/client";

export function createEmptyProfile(): MovieProfile {
  return {
    genreWeights: {},
    moodScores: {},
    eraPreference: {},
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

/** Update profile after a color swatch pick (Round 0 — baseline VA) */
export function updateProfileWithColor(
  profile: MovieProfile,
  picked: ColorSwatch,
): MovieProfile {
  const next = structuredClone(profile);
  next.moodScores.valence = picked.valence;
  next.moodScores.arousal = picked.arousal;
  next.picks.push({
    roundType: "color-pick",
    round: 0,
    alternatives: [],
  });
  return next;
}

/** Update profile after a vibe swatch pick (Round 1 — refine VA) */
export function updateProfileWithVibe(
  profile: MovieProfile,
  picked: VibeSwatch,
): MovieProfile {
  const next = structuredClone(profile);
  const existingV = next.moodScores.valence ?? 0;
  const existingA = next.moodScores.arousal ?? 0;
  next.moodScores.valence = 0.5 * existingV + 0.5 * picked.valence;
  next.moodScores.arousal = 0.5 * existingA + 0.5 * picked.arousal;
  next.picks.push({
    roundType: "vibe-pick",
    round: 1,
    alternatives: [],
  });
  return next;
}

/**
 * Update profile after an emotion pick (Round 2).
 *
 * Uses adaptive shrinkage to resist outliers:
 * - "surprise" = distance between predicted VA and picked emotion VA
 * - α = 0.8 / (1 + surprise) — confirming picks get high weight, contradicting picks get low weight
 * - At surprise=0 (perfect match): α ≈ 0.8 → strong update
 * - At surprise=1 (moderate shift): α ≈ 0.4 → cautious update
 * - At surprise=2 (max shift): α ≈ 0.27 → minimal update, assumes prior was better
 *
 * This prevents a single contradictory emotion pick from overriding
 * two consistent prior signals (color + art).
 *
 * Genre weights are seeded by proximity: genres whose VA coordinates
 * are closest to the emotion's VA get the largest boosts.
 */
export function updateProfileWithEmotion(
  profile: MovieProfile,
  picked: EmotionCard,
  genreVA: Record<string, { valence: number; arousal: number }>,
): MovieProfile {
  const next = structuredClone(profile);
  const existingV = next.moodScores.valence ?? 0;
  const existingA = next.moodScores.arousal ?? 0;

  // Adaptive shrinkage: weight by consistency with prior signals
  const surprise = Math.sqrt(
    (existingV - picked.valence) ** 2 + (existingA - picked.arousal) ** 2,
  );
  const alpha = 0.8 / (1 + surprise);

  next.moodScores.valence = alpha * picked.valence + (1 - alpha) * existingV;
  next.moodScores.arousal = alpha * picked.arousal + (1 - alpha) * existingA;

  // Seed genre weights from emotion VA proximity to genre VA map
  const genreDistances = Object.entries(genreVA).map(([name, va]) => ({
    name,
    dist: Math.sqrt(
      (va.valence - picked.valence) ** 2 + (va.arousal - picked.arousal) ** 2,
    ),
  }));
  genreDistances.sort((a, b) => a.dist - b.dist);

  // Boost top 5 closest genres, decaying by rank
  for (let i = 0; i < Math.min(5, genreDistances.length); i++) {
    const boost = 0.15 * (1 - i * 0.15); // 0.15, 0.128, 0.105, 0.083, 0.06
    next.genreWeights[genreDistances[i].name] =
      (next.genreWeights[genreDistances[i].name] ?? 0) + boost;
  }
  next.genreWeights = normalize(next.genreWeights);

  next.picks.push({
    roundType: "emotion-pick",
    round: 2,
    alternatives: [],
  });
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
