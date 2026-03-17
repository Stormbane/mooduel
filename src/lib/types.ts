// ── Core domain types ──

export type RoundType =
  | "color-pick"
  | "vibe-pick"
  | "emotion-pick"
  | "poster-pick"
  | "tournament";

// ── Mood detection types ──

export interface ColorSwatch {
  id: string;
  color: string;         // single flat HSL color
  valence: number;       // -1 to +1
  arousal: number;       // -1 to +1
}

export interface VibeSwatch {
  id: string;
  imageUrl: string;
  title: string;
  artist: string;
  valence: number;
  arousal: number;
}

export interface EmotionCard {
  id: string;
  label: string;
  valence: number;
  arousal: number;
}

export interface MovieProfile {
  genreWeights: Record<string, number>;
  moodScores: Record<string, number>;
  eraPreference: Record<string, number>;
  picks: Pick[];
}

export interface Pick {
  movieId?: number;
  roundType: RoundType;
  round: number;
  alternatives: number[];
  dwellMs?: number;
}

export type GamePhase = "playing" | "tournament" | "winner";

export interface GameState {
  currentRound: number;
  roundSequence: RoundType[];
  profile: MovieProfile;
  phase: GamePhase;
  tournament: TournamentState | null;
  winnerMovieId: number | null;
}

export interface TournamentState {
  /** All 8 movie IDs that entered the bracket */
  entrants: number[];
  /** Matchup results per bracket round: [round0 winners, round1 winners, ...] */
  bracketRounds: number[][];
  /** Index of current matchup within the current bracket round */
  currentMatchup: number;
  /** Which bracket round we're in (0=quarterfinals, 1=semis, 2=final) */
  currentBracketRound: number;
}

// ── TMDB types (subset we use) ──

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
}

export interface TmdbMovieDetails extends TmdbMovie {
  genres: { id: number; name: string }[];
  runtime: number | null;
  tagline: string;
  keywords?: { keywords: { id: number; name: string }[] };
}

export interface TmdbGenre {
  id: number;
  name: string;
}

// ── Round option types ──

export interface MovieOption {
  movie: TmdbMovie;
}

export type RoundOptions =
  | { type: "color-pick"; swatches: ColorSwatch[] }
  | { type: "vibe-pick"; swatches: VibeSwatch[] }
  | { type: "emotion-pick"; cards: EmotionCard[] }
  | { type: "poster-pick"; movies: TmdbMovie[] }
  | { type: "tournament"; movies: TmdbMovie[] };
