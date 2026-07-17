/**
 * Pairwise-comparable mood dimensions — shared between the server pool
 * (deal + column select) and game clients (round prompts, verdict math).
 * Names match the `movies` table column names exactly.
 */
export const PAIRWISE_DIMENSIONS = [
  "valence", "arousal", "dominance", "absorption", "hedonic", "eudaimonic",
  "psych_rich", "comfort_level", "conversation_potential",
] as const;
export type PairwiseDimension = (typeof PAIRWISE_DIMENSIONS)[number];

/** Dimensions collected as single-movie categorical judgments. */
export const CATEGORICAL_DIMENSIONS = ["arc", "recognition"] as const;
export type CategoricalDimension = (typeof CATEGORICAL_DIMENSIONS)[number];
