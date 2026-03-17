import type { RoundType } from "./types";

/** Bold, irreverent copy for round headers */
export const ROUND_TITLES: Record<RoundType, string[]> = {
  "color-pick": [
    "Set the Mood",
    "Pick Your Palette",
    "What Feels Right?",
  ],
  "vibe-pick": [
    "Feel the Vibe",
    "Art Check",
    "Which World?",
  ],
  "emotion-pick": [
    "Mood Check",
    "How Are You Feeling?",
    "Name It",
  ],
  "poster-pick": [
    "Pick Your Vibe",
    "What Are We Feeling?",
    "The Lineup",
    "Choose Wisely",
    "Trust Your Gut",
  ],
  "tournament": [
    "The Arena",
  ],
};

export const ROUND_SUBTITLES: Record<RoundType, string[]> = {
  "color-pick": [
    "No thinking. Just feeling.",
    "Pick the color that matches your mood right now.",
    "Your gut knows. Trust it.",
  ],
  "vibe-pick": [
    "Which painting pulls you in?",
    "Art speaks before words do.",
    "Pick the one you'd hang on your wall tonight.",
  ],
  "emotion-pick": [
    "Pick the word that fits right now.",
    "No right answer. Just your vibe.",
    "We've been reading you. Confirm or surprise us.",
  ],
  "poster-pick": [
    "Five contenders. One gets your vote.",
    "No overthinking. Just vibes.",
    "Trust the instinct. Pick the poster that calls to you.",
    "Which one are you watching tonight?",
    "We're building your taste profile in real time.",
  ],
  "tournament": [
    "Head to head. Only the strongest survive.",
  ],
};

export function getRandomCopy(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Tournament round names */
export function getTournamentCopyName(movieCount: number): string {
  if (movieCount === 8) return "Quarter-Finals";
  if (movieCount === 4) return "Semi-Finals";
  if (movieCount === 2) return "The Grand Final";
  return `Round of ${movieCount}`;
}

/** Winner screen copy */
export const WINNER_INTROS = [
  "And the winner is...",
  "Your champion has been chosen",
  "The arena has spoken",
  "Tonight you watch",
  "The verdict is in",
];

/** Reload round button text */
export const RELOAD_TEXTS = [
  "Deal me new cards",
  "Reshuffle the deck",
  "Not feeling it? Reload",
  "Fresh lineup",
  "Try again",
];

/** Progress encouragement */
export function getProgressText(round: number, total: number): string {
  const pct = round / total;
  if (pct === 0) return "Let's go";
  if (pct < 0.3) return "Warming up...";
  if (pct < 0.5) return "Your taste is taking shape";
  if (pct < 0.8) return "The picture emerges";
  return "Final round before the arena";
}
