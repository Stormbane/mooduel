/**
 * Mood Bridge — shared pure logic. Distance math lives here so the server
 * (puzzle generation, hint rail) and the client (hop validation display)
 * can never disagree about what a hop costs.
 *
 * No calibration signals in v1: hops are validated by the model's own
 * distances, so play explores the space rather than teaching it. Wiring
 * signals here would mean inventing assignments after the fact.
 */

export interface MoodPoint {
  va: number;
  ar: number;
  do: number;
  ab: number;
  he: number;
  eu: number;
  pr: number;
  co: number;
  conv: number;
}

/** Per-dimension ranges: VAD run -1..1, the rest 0..1. */
const DIMS: { key: keyof MoodPoint; range: number }[] = [
  { key: "va", range: 2 },
  { key: "ar", range: 2 },
  { key: "do", range: 2 },
  { key: "ab", range: 1 },
  { key: "he", range: 1 },
  { key: "eu", range: 1 },
  { key: "pr", range: 1 },
  { key: "co", range: 1 },
  { key: "conv", range: 1 },
];

/**
 * RMS of range-normalized differences, in [0,1]. Corpus scale (random
 * pairs): p50 ≈ 0.245, p95 ≈ 0.454.
 */
export function moodDistance(a: MoodPoint, b: MoodPoint): number {
  let sum = 0;
  for (const { key, range } of DIMS) {
    const d = (a[key] - b[key]) / range;
    sum += d * d;
  }
  return Math.sqrt(sum / DIMS.length);
}

export const BRIDGE_MAX_HOPS = 5;

/** Daily pairs are drawn from this mood-gulf band. */
export const BRIDGE_GAP_MIN = 0.38;
export const BRIDGE_GAP_MAX = 0.5;

/** Hop budget: the gulf split so the geometric floor is 4 hops. */
export function hopBudget(gap: number): number {
  return Math.max(0.1, gap / 3.4);
}

export const BRIDGE_EPOCH_UTC = "2026-07-17";

/** Wordle-style puzzle number: #1 on the epoch day. */
export function puzzleNumber(dateUtc: string): number {
  const ms = Date.parse(`${dateUtc}T00:00:00Z`) - Date.parse(`${BRIDGE_EPOCH_UTC}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** A movie as the bridge sees it: identity + mood vector. */
export interface BridgeMovie extends MoodPoint {
  id: number;
  t: string;
  y: number;
  pp: string | null;
}

export interface BridgePuzzle {
  date: string;
  number: number;
  start: BridgeMovie;
  target: BridgeMovie;
  /** Max mood distance a single hop may cover. */
  budget: number;
  /** The greedy solver's hop count — beat it and you out-routed the model. */
  par: number;
}

export interface BridgeStats {
  streak: number;
  lastSolvedDate: string | null;
  solved: number;
  played: number;
}

export const BRIDGE_STATS_KEY = "mooduel:mood-bridge:stats";
export const BRIDGE_EMPTY_STATS: BridgeStats = {
  streak: 0,
  lastSolvedDate: null,
  solved: 0,
  played: 0,
};
