// Mood contracts: generation, rendering, fit scoring (spec §4.3, §5).

import { RULES } from "./config";
import { pick, type Rng } from "./rng";
import {
  NUMERIC_DIMS, SIGNED_DIMS,
  type Clause, type Contract, type EnumDim, type Mood, type Movie,
  type NumericDim, type Verdict,
} from "./types";

type Direction = "low" | "high";

// ≥6 player-facing phrases per (numeric field, direction). Clean public
// voice: cravings a person would say out loud. No em dashes.
const NUMERIC_PHRASES: Record<NumericDim, Record<Direction, string[]>> = {
  valence: {
    high: [
      "something that leaves me grinning",
      "I want to feel good about people again",
      "warm, bright, and kind to me",
      "a movie that likes its characters",
      "sunshine, basically",
      "I want to walk out lighter than I walked in",
    ],
    low: [
      "make me cry",
      "something that hurts on purpose",
      "I want to sit in the sad",
      "bleak, and honest about it",
      "a beautiful bummer",
      "heartbreak, please",
    ],
  },
  arousal: {
    high: [
      "loud and fast",
      "I want my pulse up",
      "something that will not sit still",
      "keep me on the edge of the couch",
      "chaos, forward motion, go",
      "I want to be stressed out",
    ],
    low: [
      "quiet, please",
      "something that breathes slowly",
      "nothing explodes, nobody runs",
      "calm as a lake at night",
      "a movie that whispers",
      "gentle for a brain that has had a day",
    ],
  },
  dominance: {
    high: [
      "someone competent taking charge",
      "I want to feel unstoppable by proxy",
      "people who know exactly what they are doing",
      "power moves and steady hands",
      "a protagonist who runs the room",
      "let somebody win for once",
    ],
    low: [
      "I want to feel tiny and powerless, in a good way",
      "people swept along by things bigger than them",
      "helpless against the tide",
      "small humans, huge world",
      "nobody is in control and that is the point",
      "at the mercy of everything",
    ],
  },
  absorption: {
    high: [
      "swallow me whole",
      "I want to forget my phone exists",
      "a world I can fall into",
      "total immersion, no coming up for air",
      "make the room disappear",
      "I want to marinate",
    ],
    low: [
      "something I can half watch",
      "background movie energy",
      "easy to drift in and out of",
      "nothing that demands my full soul",
      "light grip only",
      "a movie that lets me fold laundry",
    ],
  },
  hedonic: {
    high: [
      "fun. zero homework. pure fun",
      "candy for my eyes",
      "a good time and nothing else",
      "popcorn with a capital P",
      "just entertain me",
      "delightful and proud of it",
    ],
    low: [
      "not here for fun, exactly",
      "something that earns its keep another way",
      "pleasure is not the point tonight",
      "austere is fine",
      "no sugar, thanks",
      "I want the vegetables",
    ],
  },
  eudaimonic: {
    high: [
      "make it mean something",
      "I want to feel more human afterwards",
      "moved, properly moved",
      "something that earns its tears",
      "give me the big questions",
      "I want to grow a little tonight",
    ],
    low: [
      "no lessons tonight",
      "meaning-free zone please",
      "I do not want to grow as a person",
      "keep it shallow, keep it moving",
      "nothing profound before midnight",
      "spare me the epiphanies",
    ],
  },
  psych_rich: {
    high: [
      "change my personality by the credits",
      "show me a way of seeing I have never tried",
      "complicated people being complicated",
      "I want my assumptions rearranged",
      "strange minds, strange choices",
      "make me think in a new shape",
    ],
    low: [
      "simple people, simple wants",
      "no puzzles tonight",
      "one idea is plenty",
      "I want the plot to fit on a napkin",
      "straightforward and unashamed",
      "easy reading for the eyes",
    ],
  },
  conversation_potential: {
    high: [
      "something to argue about at dinner for a week",
      "I want a movie we talk over for hours",
      "give us something to fight about",
      "discussion fuel",
      "the kind you replay in the car home",
      "an opinion generator",
    ],
    low: [
      "nothing we need to discuss afterwards",
      "watch it, nod, sleep",
      "no debate club tonight",
      "a movie that ends when it ends",
      "zero takeaways required",
      "we will never speak of it again and that is fine",
    ],
  },
  comfort_level: {
    high: [
      "something that feels like a warm bath",
      "cozy, like soup",
      "a blanket in movie form",
      "safe hands, soft landing",
      "comfort food cinema",
      "wrap me up in it",
    ],
    low: [
      "I want to squirm",
      "something that refuses to be nice",
      "an uncomfortable watch, on purpose",
      "make me brace a little",
      "no blankets, no mercy",
      "prickly and proud",
    ],
  },
};

const ENUM_PHRASES: Record<EnumDim, Record<string, { phrase: string; nearSet: string[] }>> = {
  pacing: {
    "slow-burn": { phrase: "slow. glacial. let it smolder", nearSet: ["building"] },
    building: { phrase: "start small and keep climbing", nearSet: ["slow-burn", "steady"] },
    steady: { phrase: "one even pace the whole way", nearSet: ["building", "episodic"] },
    relentless: { phrase: "over before I can think", nearSet: ["building"] },
    episodic: { phrase: "in pieces, like chapters", nearSet: ["steady"] },
  },
  ending_type: {
    triumphant: { phrase: "a happy ending I do not have to feel guilty about", nearSet: ["uplifting"] },
    bittersweet: { phrase: "ends sweet with a bruise on it", nearSet: ["ambiguous", "devastating"] },
    devastating: { phrase: "ends like a car crash in slow motion", nearSet: ["bittersweet", "unsettling"] },
    ambiguous: { phrase: "ends with a question mark", nearSet: ["twist", "unsettling"] },
    twist: { phrase: "ends somewhere I never saw coming", nearSet: ["ambiguous"] },
    uplifting: { phrase: "ends warmer than it started", nearSet: ["triumphant"] },
    unsettling: { phrase: "ends like a cold shower", nearSet: ["ambiguous", "devastating"] },
  },
  emotional_arc: {
    "man-in-a-hole": { phrase: "someone falls in a hole and claws out", nearSet: ["cinderella"] },
    oedipus: { phrase: "up, then down, then further down", nearSet: ["riches-to-rags"] },
    "riches-to-rags": { phrase: "starts fine for everyone and stays worse", nearSet: ["oedipus"] },
    icarus: { phrase: "a glorious rise and then the fall", nearSet: ["oedipus"] },
    "rags-to-riches": { phrase: "an underdog all the way up", nearSet: ["cinderella"] },
    steady: { phrase: "no rollercoaster, just a road", nearSet: [] },
    cinderella: { phrase: "up, down, and up again at the end", nearSet: ["rags-to-riches", "man-in-a-hole"] },
  },
};

const CONNECTORS = ["but", "and somehow", "then", "with"];

function numericTarget(field: NumericDim, dir: Direction): number {
  const signed = SIGNED_DIMS.includes(field);
  if (signed) return dir === "high" ? 0.7 : -0.7;
  return dir === "high" ? 0.85 : 0.15;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Generate a contract from a scoped rng stream. */
export function generateContract(rng: Rng): Contract {
  const fieldA = pick(rng, NUMERIC_DIMS);
  const dirA: Direction = rng() < 0.5 ? "high" : "low";
  const clauseA: Clause = { kind: "numeric", field: fieldA, target: numericTarget(fieldA, dirA) };
  const phraseA = pick(rng, NUMERIC_PHRASES[fieldA][dirA]);

  let clauseB: Clause;
  let phraseB: string;
  let familyB: string;
  if (rng() < 0.55) {
    let fieldB = pick(rng, NUMERIC_DIMS);
    while (fieldB === fieldA) fieldB = pick(rng, NUMERIC_DIMS);
    const dirB: Direction = rng() < 0.5 ? "high" : "low";
    clauseB = { kind: "numeric", field: fieldB, target: numericTarget(fieldB, dirB) };
    phraseB = pick(rng, NUMERIC_PHRASES[fieldB][dirB]);
    familyB = `${fieldB}:${dirB}`;
  } else {
    const enumField = pick(rng, ["pacing", "ending_type", "emotional_arc"] as const);
    const targets = Object.keys(ENUM_PHRASES[enumField]);
    const target = pick(rng, targets);
    const e = ENUM_PHRASES[enumField][target];
    clauseB = { kind: "enum", field: enumField, target, nearSet: e.nearSet };
    phraseB = e.phrase;
    familyB = `${enumField}:${target}`;
  }

  const connector = pick(rng, CONNECTORS);
  return {
    family: `${fieldA}:${dirA}+${familyB}`,
    sentence: `${cap(phraseA)}, ${connector} ${phraseB}.`,
    clauses: [clauseA, clauseB],
  };
}

// ---- Fit scoring (§4.3) ----

function clauseScore(clause: Clause, mood: Mood): number {
  if (clause.kind === "numeric") {
    const v = mood[clause.field];
    const range = SIGNED_DIMS.includes(clause.field) ? 2 : 1;
    return Math.max(0, Math.min(1, 1 - Math.abs(v - clause.target) / range));
  }
  const actual = mood[clause.field] as string;
  if (actual === clause.target) return 1;
  if (clause.nearSet.includes(actual)) return 0.5;
  return 0;
}

/** Canonical fit value: integer 0..100. fit01 is an intermediate only. */
export function fitPct(contract: Contract, mood: Mood): number {
  const fit01 = (clauseScore(contract.clauses[0], mood) + clauseScore(contract.clauses[1], mood)) / 2;
  return Math.round(fit01 * 100);
}

export function verdictFor(pct: number): Verdict {
  if (pct >= RULES.trueFitPct) return "TRUE_FIT";
  if (pct <= RULES.misfitPct) return "MISFIT";
  return "STRETCH";
}

// ---- Distance metric (§4.7): normalized Euclidean over numeric dims ----

export function toVector(mood: Mood): number[] {
  return NUMERIC_DIMS.map((d) => {
    const v = mood[d];
    return SIGNED_DIMS.includes(d) ? (v + 1) / 2 : v;
  });
}

export const NEUTRAL_VECTOR: number[] = NUMERIC_DIMS.map((d) =>
  d === "comfort_level" ? 0.8 : 0.5,
);

export function distance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export function meanVector(vs: number[][]): number[] | null {
  if (vs.length === 0) return null;
  const out = new Array(vs[0].length).fill(0);
  for (const v of vs) for (let i = 0; i < v.length; i++) out[i] += v[i];
  return out.map((x) => x / vs.length);
}

/** Nearest movies by the §4.7 metric; deterministic tie-break on tmdb_id. */
export function nearest(movies: Movie[], target: number[], count: number): Movie[] {
  return movies
    .map((m) => ({ m, d: distance(toVector(m.mood), target) }))
    .sort((x, y) => x.d - y.d || x.m.tmdb_id - y.m.tmdb_id)
    .slice(0, count)
    .map((x) => x.m);
}

/** Loader validation (§4.3): drop records with bad numeric mood values. */
export function validMovie(m: Movie): boolean {
  return NUMERIC_DIMS.every((d) => {
    const v = m.mood[d];
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
    const lo = SIGNED_DIMS.includes(d) ? -1 : 0;
    return v >= lo && v <= 1;
  });
}

/** Human-readable clause chip labels for the Overrule UI (§8.3). */
export function chipLabels(contract: Contract): { clause_a: string; clause_b: string; ending: string } {
  const label = (c: Clause): string => {
    if (c.kind === "numeric") {
      const dir = c.target > (SIGNED_DIMS.includes(c.field) ? 0 : 0.5) ? "high" : "low";
      const words: Record<NumericDim, [string, string]> = {
        valence: ["not that bleak", "not that sunny"],
        arousal: ["not that calm", "not that intense"],
        dominance: ["not that helpless", "not that mighty"],
        absorption: ["not that skippable", "not that gripping"],
        hedonic: ["not that dry", "not that fun"],
        eudaimonic: ["not that hollow", "not that deep"],
        psych_rich: ["not that simple", "not that brainy"],
        conversation_potential: ["not that forgettable", "not that chatty"],
        comfort_level: ["not that harsh", "not that cozy"],
      };
      return dir === "high" ? words[c.field][1] : words[c.field][0];
    }
    return `wrong about the ${c.field === "ending_type" ? "ending" : c.field === "pacing" ? "pace" : "shape"}`;
  };
  return {
    clause_a: label(contract.clauses[0]),
    clause_b: label(contract.clauses[1]),
    ending: "wrong about the ending",
  };
}
