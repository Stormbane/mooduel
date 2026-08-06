// viewFor projection tests (DoD §14): no seat's view ever contains
// another seat's hand, pending pitch, lane declaration, or hidden-seat
// provenance in replicant mode.

import { describe, expect, it } from "vitest";
import { initialState, reduce, viewFor, type Ctx } from "../src/core/reducer";
import type { GameState, Mood, Movie, Seat } from "../src/core/types";

const baseMood: Mood = {
  valence: 0, arousal: 0, dominance: 0, absorption: 0.5, hedonic: 0.5,
  eudaimonic: 0.5, psych_rich: 0.5, conversation_potential: 0.5,
  comfort_level: 0.5, emotional_arc: "steady", pacing: "steady",
  ending_type: "ambiguous", dominant_emotions: [], mood_tags: [], watch_context: [],
};
const MOVIES = new Map<number, Movie>(
  Array.from({ length: 40 }, (_, i) => [i + 1, {
    tmdb_id: i + 1, title: `M${i + 1}`, year: 1980, country: "US", runtime: 90,
    genres: ["Drama"], popularity: 1, poster_url: "proc:", synopsis: "s",
    vibe_sentence: "v", mood: baseMood,
  }]),
);
const ctx: Ctx = { movie: (id) => MOVIES.get(id) };

function replicantMatch(): GameState {
  const seats: Seat[] = [
    { index: 0, kind: "human", handle: "A", hiddenLabel: "A" },
    { index: 1, kind: "human", handle: "B", hiddenLabel: "B" },
    { index: 2, kind: "machine", handle: "Seat C", hiddenLabel: "C", persona: "machine" },
    { index: 3, kind: "ghost", handle: "Seat D", hiddenLabel: "D" },
  ];
  return reduce(initialState(), {
    type: "START_MATCH", matchId: "m", seed: "s", mode: "replicant",
    seats, deck: Array.from({ length: 40 }, (_, i) => i + 1),
    machineSeat: 2, ghostSeat: 3,
  }, ctx);
}

describe("viewFor projection", () => {
  it("never exposes another seat's hand", () => {
    const s = replicantMatch();
    for (const seat of [0, 1, 2, 3]) {
      const v = viewFor(s, seat);
      expect(v.yourHand).toEqual(s.hands[seat]);
      // no other seat's hand is serialized anywhere in the view
      const json = JSON.stringify(v);
      for (const other of [0, 1, 2, 3].filter((x) => x !== seat)) {
        expect(json.includes(JSON.stringify(s.hands[other]))).toBe(false);
      }
    }
  });

  it("hides pending pitches and lanes until voting / reveal", () => {
    let s = replicantMatch();
    s = reduce(s, {
      type: "SUBMIT_PITCH", seat: 1, tmdbId: s.hands[1][0], lane: "balderdash",
      seenIt: false, text: "secret pitch", auto: false,
    }, ctx);
    // phase is PITCHING: nobody sees the pending pitch, not even its author's rivals
    for (const seat of [0, 2, 3]) {
      const v = viewFor(s, seat);
      expect(v.pitches).toEqual([]);
      expect(JSON.stringify(v)).not.toContain("secret pitch");
    }
    // submit remaining pitchers to reach voting
    s = reduce(s, {
      type: "SUBMIT_PITCH", seat: 2, tmdbId: s.hands[2][0], lane: "straight",
      seenIt: false, text: "m pitch", auto: false,
    }, ctx);
    s = reduce(s, {
      type: "SUBMIT_PITCH", seat: 3, tmdbId: s.hands[3][0], lane: "straight",
      seenIt: false, text: "g pitch", auto: false,
    }, ctx);
    expect(s.phase).toBe("VOTING_CUSTOMER");
    // lanes still hidden during voting
    for (const seat of [0, 1, 2, 3]) {
      const v = viewFor(s, seat);
      for (const p of v.pitches) expect(p.lane).toBeNull();
    }
    // after reveal, lanes are public
    s = reduce(s, { type: "CUSTOMER_PICK", pitchSeat: 1, auto: false }, ctx);
    for (const voter of [1, 2, 3]) {
      s = reduce(s, { type: "SIDE_VOTE", voter, target: -1 }, ctx);
    }
    expect(s.phase).toBe("REVEAL");
    const v = viewFor(s, 0);
    expect(v.pitches.find((p) => p.seat === 1)?.lane).toBe("balderdash");
  });

  it("masks hidden-seat provenance in replicant until RESULTS", () => {
    const s = replicantMatch();
    for (const seat of [0, 1]) {
      const v = viewFor(s, seat);
      const c = v.seats[2], d = v.seats[3];
      expect(c.kind).toBe("hidden");
      expect(d.kind).toBe("hidden");
      expect(c.handle).toBe("Seat C");
      expect(d.handle).toBe("Seat D");
      expect(JSON.stringify(v)).not.toContain("machine");
      expect(JSON.stringify(v)).not.toContain("ghost");
    }
    // at RESULTS the ceremony may reveal
    const done = { ...s, phase: "RESULTS" as const };
    const v = viewFor(done, 0);
    expect(v.seats[2].kind).toBe("machine");
    expect(v.seats[3].kind).toBe("ghost");
  });

  it("solo mode shows bot personas openly", () => {
    const seats: Seat[] = [
      { index: 0, kind: "human", handle: "You" },
      { index: 1, kind: "bot", handle: "Marla", persona: "marla", skill: "hard" },
      { index: 2, kind: "bot", handle: "Dev", persona: "dev", skill: "normal" },
      { index: 3, kind: "bot", handle: "Bucket", persona: "bucket", skill: "easy" },
    ];
    const s = reduce(initialState(), {
      type: "START_MATCH", matchId: "m", seed: "s", mode: "solo",
      seats, deck: Array.from({ length: 40 }, (_, i) => i + 1),
      machineSeat: null, ghostSeat: null,
    }, ctx);
    const v = viewFor(s, 0);
    expect(v.seats[1].kind).toBe("bot");
    expect(v.seats[1].persona).toBe("marla");
  });
});
