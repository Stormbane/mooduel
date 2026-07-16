/**
 * Shared types for v1 games.
 *
 * Each game defines a GameConfig with its visual accent and identity.
 * Games own their own phase state; shared components only provide the
 * intro shell, result shell, and share/streaming infrastructure.
 */

export type GameId =
  | "hotter"
  | "blind-taste"
  | "shape-of-stories"
  | "mood-bridge"
  | "dinner-party"
  | "card-game"
  // legacy — hidden from nav; vibe-tree/mood-drift were never built,
  // the rest keep live routes
  | "vibe-tree"
  | "mood-drift"
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
  hotter: { color: "#FF4A1F", rgb: "255,74,31" },
  "blind-taste": { color: "#E91E8C", rgb: "233,30,140" },
  "shape-of-stories": { color: "#22D3EE", rgb: "34,211,238" },
  "mood-bridge": { color: "#FFB224", rgb: "255,178,36" },
  "dinner-party": { color: "#2EBD85", rgb: "46,189,133" },
  "card-game": { color: "#9F6EFF", rgb: "159,110,255" },
  "vibe-tree": { color: "#8B5CF6", rgb: "139,92,246" },
  "mood-drift": { color: "#1ED760", rgb: "30,215,96" },
  roulette: { color: "#8B5CF6", rgb: "139,92,246" },
  mirror: { color: "#1ED760", rgb: "30,215,96" },
  "comfort-zone": { color: "#F97316", rgb: "249,115,22" },
  couples: { color: "#FF6B6B", rgb: "255,107,107" },
  "mood-dj": { color: "#FBBF24", rgb: "251,191,36" },
};

export const GAMES: Record<GameId, GameConfig> = {
  hotter: {
    id: "hotter",
    title: "Hotter",
    tagline: "Two movies. One question. You against the model.",
    accent: GAME_ACCENTS.hotter,
    path: "/games/hotter",
  },
  "blind-taste": {
    id: "blind-taste",
    title: "Blind Taste Test",
    tagline: "Five vibes, no titles. Pick what you'd watch tonight.",
    accent: GAME_ACCENTS["blind-taste"],
    path: "/games/blind-taste",
  },
  "shape-of-stories": {
    id: "shape-of-stories",
    title: "Shape of Stories",
    tagline: "Every movie draws a curve. Pick the one it left in you.",
    accent: GAME_ACCENTS["shape-of-stories"],
    path: "/games/shape-of-stories",
  },
  "mood-bridge": {
    id: "mood-bridge",
    title: "Mood Bridge",
    tagline: "From one movie to another in five mood-sized steps. New puzzle daily.",
    accent: GAME_ACCENTS["mood-bridge"],
    path: "/games/mood-bridge",
  },
  "dinner-party": {
    id: "dinner-party",
    title: "The Dinner Party",
    tagline: "Four guests, four moods, one film that has to land for everyone.",
    accent: GAME_ACCENTS["dinner-party"],
    path: "/games/dinner-party",
  },
  "card-game": {
    id: "card-game",
    title: "Mooduel: The Card Game",
    tagline: "Draft eight movies and play them like a hand. Feelings are trump.",
    accent: GAME_ACCENTS["card-game"],
    path: "/games/card-game",
  },
  "vibe-tree": { id: "vibe-tree", title: "Vibe Tree", tagline: "", accent: GAME_ACCENTS["vibe-tree"], path: "/games/vibe-tree", hidden: true },
  "mood-drift": { id: "mood-drift", title: "Mood Drift", tagline: "", accent: GAME_ACCENTS["mood-drift"], path: "/games/mood-drift", hidden: true },
  roulette: { id: "roulette", title: "Mood Roulette", tagline: "", accent: GAME_ACCENTS.roulette, path: "/games/roulette", hidden: true },
  mirror: { id: "mirror", title: "Mood Mirror", tagline: "", accent: GAME_ACCENTS.mirror, path: "/games/mirror", hidden: true },
  "comfort-zone": { id: "comfort-zone", title: "Comfort Zone", tagline: "", accent: GAME_ACCENTS["comfort-zone"], path: "/games/comfort-zone", hidden: true },
  couples: { id: "couples", title: "Couples Mediator", tagline: "", accent: GAME_ACCENTS.couples, path: "/games/couples", hidden: true },
  "mood-dj": { id: "mood-dj", title: "Movie Mood DJ", tagline: "", accent: GAME_ACCENTS["mood-dj"], path: "/games/mood-dj", hidden: true },
};

/** Share payload schema per game. Keep narrow and stable — these persist forever. */
export type SharePayload =
  | { game: "hotter"; pickedMovieId: number; vsMovieId: number; dimension: string; agreed: boolean; syncs: number; takes: number; rounds: number; bestStreak: number; grid: string }
  | { game: "shape-of-stories"; pickedMovieId: number; shapes: string; agreed: number; rounds: number }
  | { game: "mood-bridge"; pickedMovieId: number; path: number[]; hops: number; par: number; number: number; usedHints: boolean }
  | { game: "dinner-party"; pickedMovieId: number; threaded: number; seats: number; grid: string }
  | { game: "card-game"; pickedMovieId: number; won: "you" | "them" | "draw"; you: number; them: number; mode: string; grid: string }
  | { game: "blind-taste"; pickedMovieId: number; passedMovieIds: number[] }
  | { game: "vibe-tree"; pickedMovieId: number; path: string[] }
  | { game: "mood-drift"; pickedMovieId: number; targetMovieId: number; guessCount: number; solved: boolean; grid: string };
