// Bots (spec §6): open personas, the template pitch brain, per-skill
// policies, and the shared HiddenSeatPolicy for Replicant mode.
// Every decision is a pure function of (seed, round, seat, purpose).

import { fitPct } from "./contracts";
import { int, pick, type Rng, stream } from "./rng";
import type { BotSkill, Clause, Contract, GameState, Lane, Movie } from "./types";
import ghostRaw from "../data/ghost-pitches.json";

export interface Persona {
  id: string;
  name: string;
  portraitSeed: number;
}

export const PERSONAS: Record<string, Persona> = {
  marla: { id: "marla", name: "Marla", portraitSeed: 11 },
  dev: { id: "dev", name: "Dev", portraitSeed: 23 },
  bucket: { id: "bucket", name: "Bucket", portraitSeed: 37 },
};

// ---- Contract keyword heuristic (NORMAL tier; also HiddenSeatPolicy) ----

const GENRE_AFFINITY: Record<string, string[]> = {
  "valence:high": ["Comedy", "Family", "Romance", "Music", "Adventure"],
  "valence:low": ["Drama", "War", "Horror", "Crime"],
  "arousal:high": ["Thriller", "Horror", "Crime", "War", "Adventure"],
  "arousal:low": ["Drama", "Romance", "Documentary", "History"],
  "dominance:high": ["Crime", "Western", "War", "Adventure"],
  "dominance:low": ["Horror", "Drama", "Mystery"],
  "absorption:high": ["Mystery", "Science Fiction", "Fantasy", "Thriller"],
  "absorption:low": ["Comedy", "Family", "Music"],
  "hedonic:high": ["Comedy", "Adventure", "Family", "Music", "Fantasy"],
  "hedonic:low": ["Documentary", "Drama", "History", "War"],
  "eudaimonic:high": ["Drama", "History", "War", "Documentary"],
  "eudaimonic:low": ["Comedy", "Horror", "Adventure"],
  "psych_rich:high": ["Mystery", "Science Fiction", "Drama", "Thriller"],
  "psych_rich:low": ["Family", "Comedy", "Western"],
  "conversation_potential:high": ["Mystery", "Science Fiction", "Drama", "Crime"],
  "conversation_potential:low": ["Family", "Music", "Comedy"],
  "comfort_level:high": ["Family", "Romance", "Comedy", "Music"],
  "comfort_level:low": ["Horror", "Thriller", "War", "Crime"],
};

function clauseKey(c: Clause): string {
  if (c.kind === "numeric") {
    const signed = ["valence", "arousal", "dominance"].includes(c.field);
    const dir = c.target > (signed ? 0 : 0.5) ? "high" : "low";
    return `${c.field}:${dir}`;
  }
  return `${c.field}:${c.target}`;
}

/** Rough 0..n heuristic score with no access to hidden mood data. */
export function heuristicScore(contract: Contract, movie: Movie): number {
  let score = 0;
  for (const clause of contract.clauses) {
    const genres = GENRE_AFFINITY[clauseKey(clause)] ?? [];
    score += movie.genres.filter((g) => genres.includes(g)).length;
  }
  return score;
}

// ---- Card / lane / vote policies per skill ----

export function chooseCard(
  skill: BotSkill, s: GameState, seat: number, movies: (id: number) => Movie | undefined,
): number {
  const hand = s.hands[seat];
  const rng = stream(s.seed, "card", s.round, seat);
  if (skill === "easy") return pick(rng, hand);
  if (skill === "normal") {
    const scored = hand.map((id) => ({
      id, h: movies(id) ? heuristicScore(s.contract!, movies(id)!) : 0,
    }));
    const max = Math.max(...scored.map((x) => x.h));
    return pick(rng, scored.filter((x) => x.h === max).map((x) => x.id));
  }
  // hard: peeks at the true fit for selection only (spec §6.1)
  const scored = hand.map((id) => ({
    id, f: movies(id) ? fitPct(s.contract!, movies(id)!.mood) : 0,
  }));
  scored.sort((a, b) => b.f - a.f || a.id - b.id);
  // Marla plays the extremes: best fit for Straight or worst for Balderdash.
  const best = scored[0], worst = scored[scored.length - 1];
  return best.f >= 100 - worst.f ? best.id : worst.id;
}

export function chooseLane(
  skill: BotSkill, s: GameState, _seat: number, tmdbId: number,
  movies: (id: number) => Movie | undefined,
): Lane {
  if (skill === "easy") return "straight";
  const m = movies(tmdbId);
  if (!m) return "straight";
  if (skill === "normal") {
    return heuristicScore(s.contract!, m) === 0 ? "balderdash" : "straight";
  }
  return fitPct(s.contract!, m.mood) <= 40 ? "balderdash" : "straight";
}

export function chooseSideVote(
  skill: BotSkill, s: GameState, voter: number, movies: (id: number) => Movie | undefined,
): number {
  const eligible = Object.values(s.pitches).map((p) => p.seat).filter((x) => x !== voter);
  if (eligible.length === 0) return -1;
  const rng = stream(s.seed, "sidevote", s.round, voter);
  if (skill === "easy") return pick(rng, eligible);
  const metric = (seat: number): number => {
    const m = movies(s.pitches[seat].tmdbId);
    if (!m) return 0;
    return skill === "hard" ? fitPct(s.contract!, m.mood) : heuristicScore(s.contract!, m);
  };
  const max = Math.max(...eligible.map(metric));
  return pick(rng, eligible.filter((x) => metric(x) === max));
}

export function chooseCustomerPick(
  skill: BotSkill, s: GameState, movies: (id: number) => Movie | undefined,
): number {
  const seats = Object.values(s.pitches).map((p) => p.seat);
  const rng = stream(s.seed, "custpick", s.round, s.customer);
  if (skill === "easy") return pick(rng, seats);
  if (skill === "normal") {
    // Dev is swayed by pitch length and keyword vibes: longest pitch wins ties.
    const metric = (seat: number) => {
      const m = movies(s.pitches[seat].tmdbId);
      return (m ? heuristicScore(s.contract!, m) : 0) * 100 + s.pitches[seat].text.length;
    };
    const max = Math.max(...seats.map(metric));
    return pick(rng, seats.filter((x) => metric(x) === max));
  }
  const metric = (seat: number) => {
    const m = movies(s.pitches[seat].tmdbId);
    return m ? fitPct(s.contract!, m.mood) : 0;
  };
  const max = Math.max(...seats.map(metric));
  return pick(rng, seats.filter((x) => metric(x) === max));
}

// ---- Template pitch brain (open personas) ----

const OPENERS: Record<string, string[]> = {
  marla: ["Projected this twice in '94.", "Seen the reel. Trust me.", "This one, no discussion.", "I know this print.", "The good copy of this is rare."],
  dev: ["Okay so this is basically", "Hear me out, this is", "Film school never covered", "This is secretly", "Critics slept on"],
  bucket: ["THIS ONE.", "I love this one!!", "The colors!!", "This poster speaks to me.", "My lid is OFF for"],
};

const CLOSERS: Record<string, string[]> = {
  marla: ["It fits. Next.", "Exactly what you asked for.", "You will thank me.", "Correct answer.", "Done."],
  dev: ["but weirder. Perfect fit.", "meets your whole vibe.", "and it goes hard.", "in the best way.", "which is exactly the brief."],
  bucket: ["It is PERFECT.", "So good!!", "Pick it pick it.", "Best year, best movie.", "I believe in it!!"],
};

export function templatePitch(persona: string, movie: Movie, rng: Rng): string {
  const open = pick(rng, OPENERS[persona] ?? OPENERS.dev);
  const close = pick(rng, CLOSERS[persona] ?? CLOSERS.dev);
  const mid = pick(rng, [
    `${movie.title} (${movie.year})`,
    `${movie.title}, ${movie.country} ${movie.year},`,
    `this ${movie.genres[0]?.toLowerCase() ?? "movie"} from ${movie.year}`,
    `${movie.title}`,
  ]);
  return `${open} ${mid} ${close}`.slice(0, 140);
}

/** Fallback pitch for human timeout auto-submit. */
export function fallbackPitch(movie: Movie): string {
  return `${movie.title}. ${movie.year}. I have a good feeling about this.`;
}

// ---- The Machine (§6.2): human-plausible template brain ----

const MACHINE_TEMPLATES = [
  "the poster on {title} is doing all the work and its working",
  "{title}, {year}. this is exactly it, dont overthink",
  "ok {title} looks precisely like what you said",
  "ive never been more sure about a {genre} in my life",
  "{title}. look at it. thats the one",
  "no notes. {title} is the one",
  "the {country} cinema of {year} understood the assignment",
  "{title} matches the brief so well its almost suspicious",
];

export function machinePitch(movie: Movie, rng: Rng): string {
  let text = pick(rng, MACHINE_TEMPLATES)
    .replace("{title}", movie.title)
    .replace("{year}", String(movie.year))
    .replace("{genre}", (movie.genres[0] ?? "movie").toLowerCase())
    .replace("{country}", movie.country);
  // 30% lowercase start (many templates already lowercase), 4% word typo rate.
  if (rng() < 0.3) text = text.charAt(0).toLowerCase() + text.slice(1);
  const words = text.split(" ");
  const typod = words.map((w) => {
    if (rng() < 0.04 && w.length > 3) {
      const i = int(rng, 1, w.length - 2);
      return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
    }
    return w;
  });
  return typod.join(" ").slice(0, 110);
}

// ---- The Ghost (§6.2/§7.3): replay a human-written corpus entry ----

const GHOST = (ghostRaw as { families: Record<string, string[]> }).families;
const MACHINE_LEN_BAND: [number, number] = [20, 110];

export function ghostPitch(contract: Contract, usedTexts: Set<string>, rng: Rng): string {
  const family = clauseKey(contract.clauses[0]);
  const pool = [...(GHOST[family] ?? []), ...GHOST.generic].filter(
    (t) =>
      !usedTexts.has(t) &&
      t.length >= MACHINE_LEN_BAND[0] &&
      t.length <= MACHINE_LEN_BAND[1],
  );
  const fallback = GHOST.generic.filter((t) => !usedTexts.has(t));
  const source = pool.length > 0 ? pool : fallback.length > 0 ? fallback : GHOST.generic;
  return pick(rng, source);
}

// ---- HiddenSeatPolicy (§6.2): one shared, role-complete policy.
// Machine and Ghost differ ONLY in pitch text source.

export const HiddenSeatPolicy = {
  chooseCard: (s: GameState, seat: number, movies: (id: number) => Movie | undefined) =>
    chooseCard("normal", s, seat, movies),
  chooseLane: (s: GameState, seat: number, tmdbId: number, movies: (id: number) => Movie | undefined) =>
    chooseLane("normal", s, seat, tmdbId, movies),
  chooseSideVote: (s: GameState, voter: number, movies: (id: number) => Movie | undefined) =>
    chooseSideVote("normal", s, voter, movies),
  /** Hidden Customer pick: seeded-RNG among pitched entries — identical for both seats. */
  chooseCustomerPick: (s: GameState): number => {
    const seats = Object.values(s.pitches).map((p) => p.seat).sort((a, b) => a - b);
    return pick(stream(s.seed, "hiddenpick", s.round, s.customer), seats);
  },
};
