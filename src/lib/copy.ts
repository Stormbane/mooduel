import type { RoundType } from "./types";

/** Gameshow-style copy for round headers */
export const ROUND_TITLES: Record<RoundType, string[]> = {
  "poster-pick": [
    "THE SELECTION",
    "CHOOSE YOUR FATE",
    "THE LINEUP",
    "FACE THE GRID",
    "THE PICKS",
  ],
  "actor-pick": [
    "STAR POWER",
    "CHOOSE YOUR CHAMPION",
    "THE A-LIST",
  ],
  "director-pick": [
    "THE VISIONARIES",
    "BEHIND THE LENS",
    "AUTEUR SHOWDOWN",
  ],
  "tournament": [
    "THE ARENA",
  ],
};

export const ROUND_SUBTITLES: Record<RoundType, string[]> = {
  "poster-pick": [
    "Five contenders enter. Only one earns your vote.",
    "Lock in your pick. No second chances.",
    "Trust your gut. The clock is ticking.",
    "Which one speaks to you? Choose wisely.",
    "The grid awaits your judgment.",
  ],
  "actor-pick": [
    "Who commands the screen tonight?",
    "Pick the face that defines your mood.",
    "One star. One vibe. Your call.",
  ],
  "director-pick": [
    "Whose world do you want to live in?",
    "Pick the mind behind the masterpiece.",
    "Every frame tells a story. Whose story?",
  ],
  "tournament": [
    "Head to head. Only the strongest survive.",
  ],
};

export function getRandomCopy(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Tournament round names — dramatic */
export function getTournamentCopyName(movieCount: number): string {
  if (movieCount === 8) return "QUARTER-FINALS";
  if (movieCount === 4) return "SEMI-FINALS";
  if (movieCount === 2) return "THE GRAND FINAL";
  return `ROUND OF ${movieCount}`;
}

/** Winner screen copy */
export const WINNER_INTROS = [
  "AND THE WINNER IS...",
  "YOUR CHAMPION HAS BEEN CHOSEN",
  "THE ARENA HAS SPOKEN",
  "TONIGHT YOU WATCH",
  "THE VERDICT IS IN",
];

/** Reload round button text */
export const RELOAD_TEXTS = [
  "DEAL ME NEW CARDS",
  "RESHUFFLE THE DECK",
  "NOT FEELING IT? RELOAD",
  "FRESH LINEUP",
  "TRY AGAIN",
];

/** Progress encouragement */
export function getProgressText(round: number, total: number): string {
  const pct = round / total;
  if (pct === 0) return "LET THE GAMES BEGIN";
  if (pct < 0.3) return "WARMING UP...";
  if (pct < 0.5) return "YOUR TASTE IS TAKING SHAPE";
  if (pct < 0.8) return "THE PICTURE EMERGES";
  return "FINAL ROUND BEFORE THE ARENA";
}
