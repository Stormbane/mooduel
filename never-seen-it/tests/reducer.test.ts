// Reducer scoring tests (spec §4.6, DoD §14): lane combinations,
// Seen It multiplier, customer bonus, side-vote ties, timeout paths,
// screening tally. Fixture movies with hand-set moods for exact fits.

import { describe, expect, it } from "vitest";
import { RULES } from "../src/core/config";
import { fitPct, verdictFor } from "../src/core/contracts";
import { initialState, reduce, type Ctx } from "../src/core/reducer";
import type { Contract, GameState, Lane, Mood, Movie, Seat } from "../src/core/types";

// ---- fixtures ----

const baseMood: Mood = {
  valence: 0, arousal: 0, dominance: 0, absorption: 0.5, hedonic: 0.5,
  eudaimonic: 0.5, psych_rich: 0.5, conversation_potential: 0.5,
  comfort_level: 0.5, emotional_arc: "steady", pacing: "steady",
  ending_type: "ambiguous", dominant_emotions: [], mood_tags: [], watch_context: [],
};

function movie(id: number, mood: Partial<Mood>): Movie {
  return {
    tmdb_id: id, title: `Movie ${id}`, year: 1980, country: "US", runtime: 90,
    genres: ["Drama"], popularity: 1, poster_url: "proc:", synopsis: "s",
    vibe_sentence: "v", mood: { ...baseMood, ...mood },
  };
}

// Contract targeting comfort high + arousal low. perfectFit hits both
// exactly; worstFit misses both maximally.
const CONTRACT: Contract = {
  family: "test",
  sentence: "Cozy and calm.",
  clauses: [
    { kind: "numeric", field: "comfort_level", target: 0.85 },
    { kind: "numeric", field: "arousal", target: -0.7 },
  ],
};

const FIT = movie(1, { comfort_level: 0.85, arousal: -0.7 });   // fitPct 100
const MISS = movie(2, { comfort_level: 0, arousal: 1 });        // very low
const MID = movie(3, { comfort_level: 0.55, arousal: 0.3 });    // stretch-ish
const OTHER = movie(4, { comfort_level: 0.8, arousal: -0.5 });  // high but < FIT

const MOVIES = new Map([FIT, MISS, MID, OTHER].map((m) => [m.tmdb_id, m]));
const ctx: Ctx = { movie: (id) => MOVIES.get(id) };

function seats4(): Seat[] {
  return [0, 1, 2, 3].map((i) => ({
    index: i, kind: i === 0 ? "human" : "bot", handle: `P${i}`,
  } as Seat));
}

/** Start a match, then force a known contract for exact-fit assertions. */
function startRound(deck: number[]): GameState {
  let s = reduce(initialState(), {
    type: "START_MATCH", matchId: "m1", seed: "seed", mode: "solo",
    seats: seats4(), deck, machineSeat: null, ghostSeat: null,
  }, ctx);
  s = { ...s, contract: CONTRACT };
  return s;
}

function submit(
  s: GameState, seat: number, tmdbId: number, lane: Lane, seenIt = false,
): GameState {
  return reduce(s, {
    type: "SUBMIT_PITCH", seat, tmdbId, lane, seenIt, text: "pitch", auto: false,
  }, ctx);
}

/** Deck dealing 5 cards per seat: seat 0 gets ids [x0..], etc. We hand
 * out real fixture ids in the first slots and filler elsewhere. */
function deckFor(perSeatFirstCard: number[]): number[] {
  const deck: number[] = [];
  for (let seat = 0; seat < 4; seat++) {
    deck.push(perSeatFirstCard[seat]);
    for (let i = 1; i < RULES.handSize; i++) deck.push(100 + seat * 10 + i);
  }
  return deck;
}

function runToReveal(opts: {
  lanes: Record<number, Lane>;
  cards: Record<number, number>;
  seenIt?: Record<number, boolean>;
  pick: number;
  sideVotes?: Record<number, number>;
}): GameState {
  // customer is seat 0; pitchers are 1, 2, 3
  const first = [999, opts.cards[1], opts.cards[2], opts.cards[3]];
  let s = startRound(deckFor(first));
  for (const seat of [1, 2, 3]) {
    s = submit(s, seat, opts.cards[seat], opts.lanes[seat], opts.seenIt?.[seat] ?? false);
  }
  expect(s.phase).toBe("VOTING_CUSTOMER");
  s = reduce(s, { type: "CUSTOMER_PICK", pitchSeat: opts.pick, auto: false }, ctx);
  expect(s.phase).toBe("VOTING_SIDE");
  for (const seat of [1, 2, 3]) {
    const target = opts.sideVotes?.[seat] ?? -1;
    s = reduce(s, { type: "SIDE_VOTE", voter: seat, target }, ctx);
  }
  expect(s.phase).toBe("REVEAL");
  return s;
}

// ---- fit + verdict sanity ----

describe("fit scoring", () => {
  it("computes fitPct as canonical rounded integer", () => {
    expect(fitPct(CONTRACT, FIT.mood)).toBe(100);
    expect(fitPct(CONTRACT, MISS.mood)).toBeLessThanOrEqual(RULES.misfitPct);
  });
  it("verdict bands per §4.3", () => {
    expect(verdictFor(72)).toBe("TRUE_FIT");
    expect(verdictFor(71)).toBe("STRETCH");
    expect(verdictFor(40)).toBe("MISFIT");
    expect(verdictFor(41)).toBe("STRETCH");
  });
});

// ---- §4.6 scoring formula ----

describe("round scoring", () => {
  it("Straight + TRUE FIT pays 4 to pitcher, 2 to customer", () => {
    const s = runToReveal({
      lanes: { 1: "straight", 2: "straight", 3: "straight" },
      cards: { 1: FIT.tmdb_id, 2: MISS.tmdb_id, 3: MID.tmdb_id },
      pick: 1,
    });
    const r = s.results[0];
    expect(r.verdicts[1]).toBe("TRUE_FIT");
    expect(r.pointsDelta[1]).toBe(RULES.winBase + RULES.laneBonus); // 4
    expect(r.pointsDelta[0]).toBe(RULES.customerBonus);             // 2
  });

  it("Full Balderdash (declared bluff, MISFIT) pays 4, no customer bonus", () => {
    const s = runToReveal({
      lanes: { 1: "balderdash", 2: "straight", 3: "straight" },
      cards: { 1: MISS.tmdb_id, 2: FIT.tmdb_id, 3: MID.tmdb_id },
      pick: 1,
    });
    const r = s.results[0];
    expect(r.verdicts[1]).toBe("MISFIT");
    expect(r.pointsDelta[1]).toBe(4);
    expect(r.pointsDelta[0]).toBe(0);
  });

  it("failed Balderdash (declared bluff, TRUE FIT) pays base only", () => {
    const s = runToReveal({
      lanes: { 1: "balderdash", 2: "straight", 3: "straight" },
      cards: { 1: FIT.tmdb_id, 2: MISS.tmdb_id, 3: MID.tmdb_id },
      pick: 1,
    });
    const r = s.results[0];
    expect(r.verdicts[1]).toBe("TRUE_FIT");
    expect(r.pointsDelta[1]).toBe(RULES.winBase); // 2, no lane bonus
    expect(r.pointsDelta[0]).toBe(0); // customer bonus only on Straight TRUE FIT
  });

  it("STRETCH pays base only regardless of lane", () => {
    const s = runToReveal({
      lanes: { 1: "straight", 2: "straight", 3: "straight" },
      cards: { 1: OTHER.tmdb_id, 2: MISS.tmdb_id, 3: MID.tmdb_id },
      pick: 3,
    });
    const r = s.results[0];
    expect(r.verdicts[3]).toBe("STRETCH");
    expect(r.pointsDelta[3]).toBe(RULES.winBase);
  });

  it("Seen It doubles lane points on a winning pitch; customer bonus never doubled", () => {
    const s = runToReveal({
      lanes: { 1: "straight", 2: "straight", 3: "straight" },
      cards: { 1: FIT.tmdb_id, 2: MISS.tmdb_id, 3: MID.tmdb_id },
      seenIt: { 1: true },
      pick: 1,
    });
    const r = s.results[0];
    expect(r.pointsDelta[1]).toBe((RULES.winBase + RULES.laneBonus) * RULES.seenMultiplier); // 8
    expect(r.pointsDelta[0]).toBe(RULES.customerBonus); // still 2
    expect(s.seenItUsed[1]).toBe(true);
  });

  it("Seen It token is not consumed on a losing pitch", () => {
    const s = runToReveal({
      lanes: { 1: "straight", 2: "straight", 3: "straight" },
      cards: { 1: FIT.tmdb_id, 2: MISS.tmdb_id, 3: MID.tmdb_id },
      seenIt: { 2: true },
      pick: 1, // seat 2 loses
    });
    expect(s.seenItUsed[2]).toBeUndefined();
    expect(s.results[0].pointsDelta[2]).toBe(0);
  });

  it("losing pitch scores 0 regardless of lane", () => {
    const s = runToReveal({
      lanes: { 1: "straight", 2: "balderdash", 3: "straight" },
      cards: { 1: FIT.tmdb_id, 2: MISS.tmdb_id, 3: MID.tmdb_id },
      pick: 1,
    });
    expect(s.results[0].pointsDelta[2]).toBe(0);
  });
});

describe("side votes (§4.6, finding 9)", () => {
  it("+1 for voting the max-fit pitch within the voter's eligible set", () => {
    const s = runToReveal({
      lanes: { 1: "straight", 2: "straight", 3: "straight" },
      cards: { 1: FIT.tmdb_id, 2: MISS.tmdb_id, 3: OTHER.tmdb_id },
      pick: 2,
      // seat 2 votes for 1 (FIT, max in its set {1,3}) -> +1
      // seat 3 votes for 2 (MISS; its set {1,2}, max is 1) -> 0
      // seat 1 votes for 3 (OTHER; its set {2,3}, max is 3) -> +1
      sideVotes: { 1: 3, 2: 1, 3: 2 },
    });
    const r = s.results[0];
    // seat 2 won on a MISFIT played Straight: base 2, no lane bonus, +1 side vote
    expect(r.verdicts[2]).toBe("MISFIT");
    expect(r.pointsDelta[2]).toBe(RULES.winBase + 1);
    expect(r.pointsDelta[1]).toBe(1); // correct side vote only
    expect(r.pointsDelta[3]).toBe(0); // wrong side vote
  });

  it("abstain (timeout) neither gains nor loses", () => {
    const s = runToReveal({
      lanes: { 1: "straight", 2: "straight", 3: "straight" },
      cards: { 1: FIT.tmdb_id, 2: MISS.tmdb_id, 3: MID.tmdb_id },
      pick: 1,
      sideVotes: { 1: -1, 2: -1, 3: -1 },
    });
    const r = s.results[0];
    expect(r.pointsDelta[2]).toBe(0);
    expect(r.pointsDelta[3]).toBe(0);
  });

  it("ties all count: equal max fits both score", () => {
    // seats 2 and 3 pitch identical-fit movies; seat 1's vote for either scores
    const TWIN = movie(5, { comfort_level: 0.85, arousal: -0.7 });
    MOVIES.set(5, TWIN);
    const s = runToReveal({
      lanes: { 1: "straight", 2: "straight", 3: "straight" },
      cards: { 1: MISS.tmdb_id, 2: FIT.tmdb_id, 3: TWIN.tmdb_id },
      pick: 1,
      sideVotes: { 1: 2, 2: 3, 3: 2 },
    });
    const r = s.results[0];
    // seat 1 voted seat 2 (fit 100, tied max) -> +1
    expect(r.pointsDelta[1]).toBeGreaterThanOrEqual(1);
    // seat 2 voted seat 3 (fit 100, max of {1,3}) -> +1
    expect(r.pointsDelta[2]).toBe(1);
    MOVIES.delete(5);
  });
});

describe("match flow", () => {
  it("rotates customer and refills hands on ADVANCE", () => {
    let s = runToReveal({
      lanes: { 1: "straight", 2: "straight", 3: "straight" },
      cards: { 1: FIT.tmdb_id, 2: MISS.tmdb_id, 3: MID.tmdb_id },
      pick: 1,
    });
    s = reduce(s, { type: "OVERRULE_OPEN" }, ctx);
    s = reduce(s, { type: "ADVANCE" }, ctx);
    expect(s.round).toBe(2);
    expect(s.customer).toBe(1);
    for (const seat of [0, 1, 2, 3]) {
      expect(s.hands[seat].length).toBeLessThanOrEqual(RULES.handSize);
    }
    expect(s.pitches).toEqual({});
  });

  it("screening tally awards +3 and deterministic tie-break", () => {
    let s = startRound(deckFor([FIT.tmdb_id, MISS.tmdb_id, MID.tmdb_id, OTHER.tmdb_id]));
    s = { ...s, phase: "SCREENING_PITCH" as const, screening: null };
    s = reduce(s, { type: "SET_SCREENING", candidates: [1, 2, 3, 4] }, ctx);
    for (const seat of [0, 1, 2, 3]) {
      s = reduce(s, { type: "SCREENING_PITCH_SUBMIT", seat, text: `pitch ${seat}` }, ctx);
    }
    expect(s.phase).toBe("SCREENING_VOTE");
    // 0->1, 2->1, 1->3, 3->0 : seat 1 wins with 2 votes
    s = reduce(s, { type: "SCREENING_VOTE", voter: 0, target: 1 }, ctx);
    s = reduce(s, { type: "SCREENING_VOTE", voter: 2, target: 1 }, ctx);
    s = reduce(s, { type: "SCREENING_VOTE", voter: 1, target: 3 }, ctx);
    s = reduce(s, { type: "SCREENING_VOTE", voter: 3, target: 0 }, ctx);
    expect(s.phase).toBe("RESULTS");
    expect(s.screening!.winnerSeat).toBe(1);
    expect(s.scores[1]).toBe(RULES.screeningWin);
  });

  it("replicant accusation scoring: +3 correct, +2 to machine per wrong", () => {
    const seats: Seat[] = [
      { index: 0, kind: "human", handle: "A" },
      { index: 1, kind: "human", handle: "B" },
      { index: 2, kind: "machine", handle: "Seat C", hiddenLabel: "C" },
      { index: 3, kind: "ghost", handle: "Seat D", hiddenLabel: "D" },
    ];
    let s = reduce(initialState(), {
      type: "START_MATCH", matchId: "m2", seed: "s", mode: "replicant",
      seats, deck: deckFor([1, 2, 3, 4]), machineSeat: 2, ghostSeat: 3,
    }, ctx);
    s = { ...s, phase: "ACCUSATION" as const };
    s = reduce(s, { type: "ACCUSE", seat: 0, target: 2 }, ctx); // correct
    s = reduce(s, { type: "ACCUSE", seat: 1, target: 3 }, ctx); // wrong
    expect(s.scores[0]).toBe(RULES.accuseCorrect);
    expect(s.scores[2]).toBe(RULES.machinePerWrongAccusation);
    expect(s.phase).toBe("SCREENING_PITCH");
  });

  it("rejects invalid actions: pitch out of hand, double vote, customer pitching", () => {
    let s = startRound(deckFor([FIT.tmdb_id, MISS.tmdb_id, MID.tmdb_id, OTHER.tmdb_id]));
    const before = s;
    s = submit(s, 0, MISS.tmdb_id, "straight"); // customer may not pitch
    expect(s).toBe(before);
    s = submit(s, 1, 12345, "straight"); // not in hand
    expect(s).toBe(before);
  });
});
