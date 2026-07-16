import { PAIRWISE_DIMENSIONS, type PairwiseDimension } from "./dimensions";

/**
 * Hotter — pure game logic. Round prompts, verdict math, run scoring.
 * UI lives in src/app/games/hotter/page.tsx.
 */

export const RUN_LENGTH = 12;

export interface DimensionCopy {
  /** The round prompt shown above the two posters. */
  question: string;
  /** What the model measured — used in verdict and result copy. */
  noun: string;
  /** Score range for this dimension in the movies table. */
  scale: [number, number];
}

export const DIMENSION_COPY: Record<PairwiseDimension, DimensionCopy> = {
  valence: { question: "Which one sends you out happier?", noun: "afterglow", scale: [-1, 1] },
  arousal: { question: "Which one gets your pulse up?", noun: "adrenaline", scale: [-1, 1] },
  dominance: { question: "After which one do you walk taller?", noun: "swagger", scale: [-1, 1] },
  absorption: { question: "Which one makes the room disappear?", noun: "pull", scale: [0, 1] },
  hedonic: { question: "Which one is just more fun?", noun: "fun", scale: [0, 1] },
  eudaimonic: { question: "Which one means more?", noun: "weight", scale: [0, 1] },
  psych_rich: { question: "Which one gives you more to chew on?", noun: "depth", scale: [0, 1] },
  comfort_level: { question: "Which one would you put on after a brutal day?", noun: "comfort", scale: [0, 1] },
  conversation_potential: { question: "Which one starts the longer argument?", noun: "debate", scale: [0, 1] },
};

export function randomDimension(): PairwiseDimension {
  return PAIRWISE_DIMENSIONS[Math.floor(Math.random() * PAIRWISE_DIMENSIONS.length)];
}

/**
 * sync     — you and the model ranked the pair the same way
 * take     — you defied the model (a hot take, recorded with pride)
 * tie      — the score gap is inside the dead-heat band; the model abstains
 * unscored — the model has no score for one side; your read is the first
 */
export type Verdict = "sync" | "take" | "tie" | "unscored";

/** Normalized score gap below which the model refuses to call a pair. */
export const TIE_THRESHOLD = 0.05;

/** Signed gap (picked − other), normalized to the dimension's range. */
export function normalizedGap(
  dimension: PairwiseDimension,
  pickedScore: number | null,
  otherScore: number | null,
): number {
  if (pickedScore == null || otherScore == null) return 0;
  const [lo, hi] = DIMENSION_COPY[dimension].scale;
  return (pickedScore - otherScore) / (hi - lo);
}

export function judge(
  dimension: PairwiseDimension,
  pickedScore: number | null,
  otherScore: number | null,
): Verdict {
  if (pickedScore == null || otherScore == null) return "unscored";
  const gap = normalizedGap(dimension, pickedScore, otherScore);
  if (Math.abs(gap) < TIE_THRESHOLD) return "tie";
  return gap > 0 ? "sync" : "take";
}

/** Share-grid glyph per round. Reads like a Wordle row for taste. */
export const GRID_GLYPH: Record<Verdict, string> = {
  sync: "🔥",
  take: "🌶️",
  tie: "🤝",
  unscored: "🤝",
};

/** How long each verdict stays on screen before the next deal (ms). */
export const VERDICT_MS: Record<Verdict, number> = {
  sync: 950,
  tie: 1300,
  take: 1650,
  unscored: 1450,
};

export interface RoundRecord {
  verdict: Verdict;
  dimension: PairwiseDimension;
  pickedId: number;
  pickedTitle: string;
  otherId: number;
  otherTitle: string;
  /** Signed normalized gap, picked − other. */
  gap: number;
}

export interface HotterStats {
  runs: number;
  rounds: number;
  syncs: number;
  takes: number;
  bestStreak: number;
}

export const STATS_KEY = "mooduel:hotter:stats";

export const EMPTY_STATS: HotterStats = {
  runs: 0, rounds: 0, syncs: 0, takes: 0, bestStreak: 0,
};

/**
 * The movie a run gets remembered by: your boldest defiance of the model,
 * or failing that your highest-conviction sync, or the last pick.
 */
export function championRound(records: RoundRecord[]): RoundRecord | null {
  if (records.length === 0) return null;
  const byGap = (rs: RoundRecord[]) =>
    rs.reduce((best, r) => (Math.abs(r.gap) > Math.abs(best.gap) ? r : best));
  const takes = records.filter((r) => r.verdict === "take");
  if (takes.length > 0) return byGap(takes);
  const syncs = records.filter((r) => r.verdict === "sync");
  if (syncs.length > 0) return byGap(syncs);
  return records[records.length - 1];
}
