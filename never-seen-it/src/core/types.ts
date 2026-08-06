// Core domain types (spec §7.1, §4, §17).

export type EmotionalArc =
  | "man-in-a-hole" | "oedipus" | "riches-to-rags" | "icarus"
  | "rags-to-riches" | "steady" | "cinderella";
export type Pacing = "slow-burn" | "building" | "steady" | "relentless" | "episodic";
export type EndingType =
  | "triumphant" | "bittersweet" | "devastating" | "ambiguous"
  | "twist" | "uplifting" | "unsettling";

export const NUMERIC_DIMS = [
  "valence", "arousal", "dominance", "absorption", "hedonic",
  "eudaimonic", "psych_rich", "conversation_potential", "comfort_level",
] as const;
export type NumericDim = (typeof NUMERIC_DIMS)[number];
export const SIGNED_DIMS: readonly NumericDim[] = ["valence", "arousal", "dominance"];

export interface Mood {
  valence: number; arousal: number; dominance: number;
  absorption: number; hedonic: number; eudaimonic: number;
  psych_rich: number; conversation_potential: number; comfort_level: number;
  emotional_arc: EmotionalArc;
  pacing: Pacing;
  ending_type: EndingType;
  dominant_emotions: string[];
  mood_tags: string[];
  watch_context: string[];
}

export interface Movie {
  tmdb_id: number;
  title: string;
  year: number;
  country: string;
  runtime: number;
  genres: string[];
  popularity: number;
  poster_url: string; // "proc:" prefix → procedural poster from tmdb_id
  synopsis: string;
  vibe_sentence: string;
  mood: Mood;
}

export type EnumDim = "pacing" | "ending_type" | "emotional_arc";

export type Clause =
  | { kind: "numeric"; field: NumericDim; target: number }
  | { kind: "enum"; field: EnumDim; target: string; nearSet: string[] };

export interface Contract {
  family: string;   // template family id, keys the ghost corpus
  sentence: string; // player-facing craving
  clauses: [Clause, Clause];
}

export type Lane = "straight" | "balderdash";
export type Verdict = "TRUE_FIT" | "STRETCH" | "MISFIT";
export type SeatKind = "human" | "bot" | "machine" | "ghost";
export type Mode = "solo" | "hotseat" | "replicant";
export type BotSkill = "easy" | "normal" | "hard";

export interface Seat {
  index: number;
  kind: SeatKind;
  handle: string;       // display name
  profileId?: string;   // humans only
  persona?: string;     // bots: marla | dev | bucket; machine persona
  skill?: BotSkill;
  hiddenLabel?: string; // replicant mode: "A".."D" anonymized label
}

export interface Pitch {
  seat: number;
  tmdbId: number;
  lane: Lane;
  seenIt: boolean;
  text: string;
  auto: boolean; // true when produced by timeout fallback
}

export interface RoundResult {
  round: number;
  contract: Contract;
  customer: number;
  pitches: Pitch[];
  winnerSeat: number;
  fits: Record<number, number>; // seat -> fitPct of their pitched movie
  verdicts: Record<number, Verdict>;
  sideVotes: Record<number, number>; // voter seat -> voted-for seat
  pointsDelta: Record<number, number>;
}

export type Chip = "clause_a" | "clause_b" | "ending";

export type Phase =
  | "LOBBY" | "DEALING" | "MOOD" | "PITCHING" | "VOTING_CUSTOMER"
  | "VOTING_SIDE" | "REVEAL" | "OVERRULE" | "ACCUSATION"
  | "SCREENING_PITCH" | "SCREENING_VOTE" | "RESULTS";

export interface ScreeningState {
  candidates: number[]; // tmdb ids, one per seat by index
  pitches: Record<number, string>;
  votes: Record<number, number>; // voter -> seat voted for
  winnerSeat: number | null;
}

export interface GameState {
  phase: Phase;
  matchId: string;       // host-entropy instance id (§8.1)
  seed: string;          // deterministic RNG seed
  mode: Mode;
  seats: Seat[];
  machineSeat: number | null; // replicant mode
  ghostSeat: number | null;
  round: number;         // 1-based
  customer: number;      // seat index
  hands: Record<number, number[]>; // seat -> tmdb ids
  deck: number[];        // remaining deal-pool tmdb ids
  contract: Contract | null;
  pitches: Record<number, Pitch>; // this round, by seat
  sideVotes: Record<number, number>;
  customerPick: number | null;    // winning pitch's seat
  scores: Record<number, number>;
  results: RoundResult[];
  overrules: { seat: number; chip: Chip | null }[];
  seenItVerdict: { seat: number; agrees: boolean; chip: Chip | null } | null;
  seenItUsed: Record<number, boolean>; // token spent (winning pitch only)
  accusations: Record<number, number>; // human seat -> accused seat
  screening: ScreeningState | null;
  eventCounter: number; // §8.1 monotonic counter
}

export interface MoodVector {
  /** all nine numeric dims mapped to [0,1] */
  v: number[];
}

// §17 identity
export interface Profile {
  id: string;
  handle: string;
  portraitSeed: number;
  createdAt: number;
}

export interface MatchSummary {
  matchId: string;
  endedAt: number;
  mode: Mode;
  seats: { handle: string; kind: SeatKind; score: number }[];
  profileSeat: number;
  won: boolean;
  laneStats: {
    straight: number; balderdash: number;
    fullBalderdash: number; failedBalderdash: number;
  };
  seenItUsed: boolean;
  accusation?: { made: boolean; correct: boolean };
  tonightVector: number[];
}

export interface ProfileStats {
  matches: number;
  wins: number;
  totalPoints: number;
  fullBalderdash: number;
  failedBalderdash: number;
  seenItPlays: number;
  accusationsMade: number;
  accusationsCorrect: number;
  favoriteLane: Lane | null;
  meanTonightVector: number[] | null;
}
