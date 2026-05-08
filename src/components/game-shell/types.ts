/**
 * Shared types for v1 games.
 *
 * Each game defines a GameConfig with its visual accent and identity.
 * Games own their own phase state; shared components only provide the
 * intro shell, result shell, and share/streaming infrastructure.
 */

export type GameId =
  | "blind-taste"
  | "vibe-tree"
  | "mood-drift"
  // legacy — hidden from nav but routes remain live
  | "roulette"
  | "mirror"
  | "comfort-zone"
  | "couples"
  | "mood-dj";

export interface GameAccent {
  /** Hex colour for the game's accent (buttons, eyebrows, borders). */
  color: string;
  /** Tailwind CSS var name matching the accent, used for `rgb()`/`rgba()` calls. */
  rgb: string;
}

export interface GameConfig {
  id: GameId;
  title: string;
  tagline: string;
  accent: GameAccent;
  path: `/games/${string}` | "/play";
  /** Hide from nav/landing but keep route alive. */
  hidden?: boolean;
}

/** Accents keyed by GameId. CSS custom properties remain the source of truth. */
export const GAME_ACCENTS: Record<GameId, GameAccent> = {
  "blind-taste": { color: "#E91E8C", rgb: "233,30,140" },
  "vibe-tree": { color: "#8B5CF6", rgb: "139,92,246" },
  "mood-drift": { color: "#1ED760", rgb: "30,215,96" },
  roulette: { color: "#8B5CF6", rgb: "139,92,246" },
  mirror: { color: "#1ED760", rgb: "30,215,96" },
  "comfort-zone": { color: "#F97316", rgb: "249,115,22" },
  couples: { color: "#FF6B6B", rgb: "255,107,107" },
  "mood-dj": { color: "#FBBF24", rgb: "251,191,36" },
};

export const GAMES: Record<GameId, GameConfig> = {
  "blind-taste": {
    id: "blind-taste",
    title: "Blind Taste Test",
    tagline: "Five vibes, no titles. Pick what you'd watch tonight.",
    accent: GAME_ACCENTS["blind-taste"],
    path: "/games/blind-taste",
  },
  "vibe-tree": {
    id: "vibe-tree",
    title: "Vibe Tree",
    tagline: "Navigate the mood landscape branch by branch until one movie remains.",
    accent: GAME_ACCENTS["vibe-tree"],
    path: "/games/vibe-tree",
  },
  "mood-drift": {
    id: "mood-drift",
    title: "Mood Drift",
    tagline: "Guess today's movie by feel. Six tries. Wordle for vibes.",
    accent: GAME_ACCENTS["mood-drift"],
    path: "/games/mood-drift",
  },
  roulette: { id: "roulette", title: "Mood Roulette", tagline: "", accent: GAME_ACCENTS.roulette, path: "/games/roulette", hidden: true },
  mirror: { id: "mirror", title: "Mood Mirror", tagline: "", accent: GAME_ACCENTS.mirror, path: "/games/mirror", hidden: true },
  "comfort-zone": { id: "comfort-zone", title: "Comfort Zone", tagline: "", accent: GAME_ACCENTS["comfort-zone"], path: "/games/comfort-zone", hidden: true },
  couples: { id: "couples", title: "Couples Mediator", tagline: "", accent: GAME_ACCENTS.couples, path: "/games/couples", hidden: true },
  "mood-dj": { id: "mood-dj", title: "Movie Mood DJ", tagline: "", accent: GAME_ACCENTS["mood-dj"], path: "/games/mood-dj", hidden: true },
};

/** Share payload schema per game. Keep narrow and stable — these persist forever. */
export type SharePayload =
  | { game: "blind-taste"; pickedMovieId: number; passedMovieIds: number[] }
  | { game: "vibe-tree"; pickedMovieId: number; path: string[] }
  | { game: "mood-drift"; pickedMovieId: number; targetMovieId: number; guessCount: number; solved: boolean; grid: string };
