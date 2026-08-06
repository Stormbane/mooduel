// Mood readout copy (spec §9): a human sentence from the two most
// extreme dimensions of a normalized tonight-vector. Craving register,
// no dimension names, no em dashes.

import { NUMERIC_DIMS } from "../core/types";

const WORDS: Record<string, [string, string]> = {
  // [low word, high word] per dimension, in receipt register
  valence: ["devastating", "sunny"],
  arousal: ["slow", "frantic"],
  dominance: ["helpless", "commanding"],
  absorption: ["breezy", "all-consuming"],
  hedonic: ["austere", "candy-coated"],
  eudaimonic: ["weightless", "soul-heavy"],
  psych_rich: ["simple", "labyrinthine"],
  conversation_potential: ["quiet", "argument-starting"],
  comfort_level: ["merciless", "cozy"],
};

/** Two descriptive words for the most extreme dims of a [0,1]^9 vector. */
export function extremeWords(vector: number[]): [string, string] {
  const scored = NUMERIC_DIMS.map((d, i) => ({
    d, v: vector[i] ?? 0.5, extremity: Math.abs((vector[i] ?? 0.5) - 0.5),
  })).sort((a, b) => b.extremity - a.extremity);
  const top = scored.slice(0, 2);
  return [
    WORDS[top[0].d][top[0].v > 0.5 ? 1 : 0],
    WORDS[top[1].d][top[1].v > 0.5 ? 1 : 0],
  ];
}

export function tonightSentence(vector: number[] | null): string {
  if (!vector || vector.length === 0) {
    return "Tonight you voted for nothing at all. Bold. The archive suggests these anyway:";
  }
  const [a, b] = extremeWords(vector);
  return `Tonight you kept choosing ${a} and ${b}. Seek help, or seek these:`;
}

export function lifetimeSentence(vector: number[] | null): string {
  if (!vector || vector.length === 0) return "Lifetime: undecided. The receipts are still printing.";
  const [a, b] = extremeWords(vector);
  return `Lifetime: ${a}, ${b}, no regrets.`;
}
