// Pure game reducer (spec §10.4). (state, action, ctx) -> state.
// ctx carries the movie lookup — deterministic data, not behavior.

import { RULES } from "./config";
import { fitPct, generateContract, verdictFor } from "./contracts";
import { pick, stream } from "./rng";
import type {
  Chip, Contract, GameState, Lane, Movie, Pitch, RoundResult, Seat, Verdict,
} from "./types";

export interface Ctx {
  movie(id: number): Movie | undefined;
}

export type Action =
  | { type: "START_MATCH"; matchId: string; seed: string; mode: GameState["mode"];
      seats: Seat[]; deck: number[]; machineSeat: number | null; ghostSeat: number | null }
  | { type: "SUBMIT_PITCH"; seat: number; tmdbId: number; lane: Lane;
      seenIt: boolean; text: string; auto: boolean }
  | { type: "CUSTOMER_PICK"; pitchSeat: number; auto: boolean }
  | { type: "SIDE_VOTE"; voter: number; target: number } // target -1 = abstain
  | { type: "OVERRULE_OPEN" }
  | { type: "OVERRULE"; seat: number; chip: Chip | null }
  | { type: "SEEN_IT_VERDICT"; seat: number; agrees: boolean; chip: Chip | null }
  | { type: "ADVANCE" }
  | { type: "ACCUSE"; seat: number; target: number }
  | { type: "SET_SCREENING"; candidates: number[] }
  | { type: "SCREENING_PITCH_SUBMIT"; seat: number; text: string }
  | { type: "SCREENING_VOTE"; voter: number; target: number };

export function initialState(): GameState {
  return {
    phase: "LOBBY", matchId: "", seed: "", mode: "solo", seats: [],
    machineSeat: null, ghostSeat: null, round: 0, customer: 0,
    hands: {}, deck: [], contract: null, pitches: {}, sideVotes: {},
    customerPick: null, scores: {}, results: [], overrules: [],
    seenItVerdict: null, seenItUsed: {}, accusations: {}, screening: null,
    eventCounter: 0,
  };
}

function contractFor(seed: string, round: number): Contract {
  return generateContract(stream(seed, "contract", round));
}

function pitchers(s: GameState): number[] {
  return s.seats.map((x) => x.index).filter((i) => i !== s.customer);
}

export function reduce(s: GameState, a: Action, ctx: Ctx): GameState {
  switch (a.type) {
    case "START_MATCH": {
      const hands: Record<number, number[]> = {};
      const deck = a.deck.slice();
      for (const seat of a.seats) hands[seat.index] = deck.splice(0, RULES.handSize);
      const scores: Record<number, number> = {};
      for (const seat of a.seats) scores[seat.index] = 0;
      return {
        ...initialState(),
        phase: "MOOD", matchId: a.matchId, seed: a.seed, mode: a.mode,
        seats: a.seats, machineSeat: a.machineSeat, ghostSeat: a.ghostSeat,
        round: 1, customer: 0, hands, deck, scores,
        contract: contractFor(a.seed, 1),
      };
    }

    case "SUBMIT_PITCH": {
      if (s.phase !== "MOOD" && s.phase !== "PITCHING") return s;
      if (a.seat === s.customer || s.pitches[a.seat]) return s;
      if (!s.hands[a.seat]?.includes(a.tmdbId)) return s;
      const seenIt = a.seenIt && !s.seenItUsed[a.seat];
      const pitch: Pitch = {
        seat: a.seat, tmdbId: a.tmdbId, lane: a.lane, seenIt,
        text: a.text.slice(0, RULES.pitchMaxChars), auto: a.auto,
      };
      const pitches = { ...s.pitches, [a.seat]: pitch };
      const hands = { ...s.hands, [a.seat]: s.hands[a.seat].filter((id) => id !== a.tmdbId) };
      const all = pitchers(s).every((i) => pitches[i]);
      return { ...s, phase: all ? "VOTING_CUSTOMER" : "PITCHING", pitches, hands };
    }

    case "CUSTOMER_PICK": {
      if (s.phase !== "VOTING_CUSTOMER" || !s.pitches[a.pitchSeat]) return s;
      return { ...s, phase: "VOTING_SIDE", customerPick: a.pitchSeat, sideVotes: {} };
    }

    case "SIDE_VOTE": {
      if (s.phase !== "VOTING_SIDE") return s;
      const voters = pitchers(s);
      if (!voters.includes(a.voter) || a.voter in s.sideVotes) return s;
      if (a.target !== -1 && (a.target === a.voter || !s.pitches[a.target])) return s;
      const sideVotes = { ...s.sideVotes, [a.voter]: a.target };
      if (!voters.every((v) => v in sideVotes)) return { ...s, sideVotes };
      return applyReveal({ ...s, sideVotes }, ctx);
    }

    case "OVERRULE_OPEN":
      return s.phase === "REVEAL" ? { ...s, phase: "OVERRULE" } : s;

    case "OVERRULE": {
      if (s.phase !== "OVERRULE") return s;
      if (s.overrules.some((o) => o.seat === a.seat)) return s;
      return { ...s, overrules: [...s.overrules, { seat: a.seat, chip: a.chip }] };
    }

    case "SEEN_IT_VERDICT": {
      if (s.phase !== "REVEAL" && s.phase !== "OVERRULE") return s;
      const p = s.pitches[a.seat];
      if (!p?.seenIt || s.seenItVerdict) return s;
      return { ...s, seenItVerdict: { seat: a.seat, agrees: a.agrees, chip: a.chip } };
    }

    case "ADVANCE": {
      if (s.phase !== "OVERRULE") return s;
      if (s.round < RULES.rounds) {
        const round = s.round + 1;
        const deck = s.deck.slice();
        const hands = { ...s.hands };
        for (const seat of s.seats) {
          const h = hands[seat.index].slice();
          while (h.length < RULES.handSize && deck.length > 0) h.push(deck.shift()!);
          hands[seat.index] = h;
        }
        return {
          ...s, phase: "MOOD", round, customer: (s.customer + 1) % s.seats.length,
          hands, deck, contract: contractFor(s.seed, round),
          pitches: {}, sideVotes: {}, customerPick: null,
          overrules: [], seenItVerdict: null,
        };
      }
      if (s.mode === "replicant") return { ...s, phase: "ACCUSATION" };
      return { ...s, phase: "SCREENING_PITCH", screening: null };
    }

    case "ACCUSE": {
      if (s.phase !== "ACCUSATION") return s;
      const seat = s.seats[a.seat];
      if (!seat || seat.kind !== "human" || a.seat in s.accusations) return s;
      if (a.target !== s.machineSeat && a.target !== s.ghostSeat) return s;
      const accusations = { ...s.accusations, [a.seat]: a.target };
      const humans = s.seats.filter((x) => x.kind === "human").map((x) => x.index);
      if (!humans.every((h) => h in accusations)) return { ...s, accusations };
      const scores = { ...s.scores };
      for (const h of humans) {
        if (accusations[h] === s.machineSeat) scores[h] += RULES.accuseCorrect;
        else if (s.machineSeat != null) scores[s.machineSeat] += RULES.machinePerWrongAccusation;
      }
      return { ...s, accusations, scores, phase: "SCREENING_PITCH", screening: null };
    }

    case "SET_SCREENING": {
      if (s.phase !== "SCREENING_PITCH" || s.screening) return s;
      return {
        ...s,
        screening: { candidates: a.candidates, pitches: {}, votes: {}, winnerSeat: null },
      };
    }

    case "SCREENING_PITCH_SUBMIT": {
      if (s.phase !== "SCREENING_PITCH" || !s.screening) return s;
      if (a.seat in s.screening.pitches) return s;
      const scr = {
        ...s.screening,
        pitches: { ...s.screening.pitches, [a.seat]: a.text.slice(0, RULES.pitchMaxChars) },
      };
      const all = s.seats.every((x) => x.index in scr.pitches);
      return { ...s, screening: scr, phase: all ? "SCREENING_VOTE" : "SCREENING_PITCH" };
    }

    case "SCREENING_VOTE": {
      if (s.phase !== "SCREENING_VOTE" || !s.screening) return s;
      if (a.voter in s.screening.votes || a.target === a.voter) return s;
      if (!(a.target in s.screening.pitches)) return s;
      const votes = { ...s.screening.votes, [a.voter]: a.target };
      const scr = { ...s.screening, votes };
      if (!s.seats.every((x) => x.index in votes)) return { ...s, screening: scr };
      // Tally; tie-break via seeded stream for determinism.
      const tally = new Map<number, number>();
      for (const t of Object.values(votes)) tally.set(t, (tally.get(t) ?? 0) + 1);
      const max = Math.max(...tally.values());
      const top = [...tally.entries()].filter(([, n]) => n === max).map(([t]) => t).sort((x, y) => x - y);
      const winner = top.length === 1 ? top[0] : pick(stream(s.seed, "screeningTie"), top);
      const scores = { ...s.scores, [winner]: s.scores[winner] + RULES.screeningWin };
      return { ...s, screening: { ...scr, winnerSeat: winner }, scores, phase: "RESULTS" };
    }
  }
}

/** Compute reveal: fits, verdicts, §4.6 scoring formula; enter REVEAL. */
function applyReveal(s: GameState, ctx: Ctx): GameState {
  const contract = s.contract!;
  const fits: Record<number, number> = {};
  const verdicts: Record<number, Verdict> = {};
  for (const p of Object.values(s.pitches)) {
    const m = ctx.movie(p.tmdbId);
    const pct = m ? fitPct(contract, m.mood) : 0;
    fits[p.seat] = pct;
    verdicts[p.seat] = verdictFor(pct);
  }

  const delta: Record<number, number> = {};
  for (const seat of s.seats) delta[seat.index] = 0;

  const winnerSeat = s.customerPick!;
  const winner = s.pitches[winnerSeat];
  const verdict = verdicts[winnerSeat];
  const laneMatches =
    (winner.lane === "straight" && verdict === "TRUE_FIT") ||
    (winner.lane === "balderdash" && verdict === "MISFIT");
  const winBase = RULES.winBase;
  const laneBonus = laneMatches ? RULES.laneBonus : 0;
  const seenMult = winner.seenIt ? RULES.seenMultiplier : 1;
  delta[winnerSeat] += (winBase + laneBonus) * seenMult;
  if (winner.lane === "straight" && verdict === "TRUE_FIT") {
    delta[s.customer] += RULES.customerBonus; // never multiplied
  }

  // Side votes (§4.6): +1 when the vote hits the max fitPct within the
  // voter's own eligible set; ties all count.
  for (const [voterStr, target] of Object.entries(s.sideVotes)) {
    const voter = Number(voterStr);
    if (target === -1) continue;
    const eligible = Object.keys(s.pitches).map(Number).filter((p) => p !== voter);
    const maxFit = Math.max(...eligible.map((p) => fits[p]));
    if (fits[target] === maxFit) delta[voter] += RULES.sideVotePoint;
  }

  const scores = { ...s.scores };
  for (const [k, v] of Object.entries(delta)) scores[Number(k)] += v;

  const seenItUsed = { ...s.seenItUsed };
  if (winner.seenIt) seenItUsed[winnerSeat] = true; // spent only on a winning pitch

  const result: RoundResult = {
    round: s.round, contract, customer: s.customer,
    pitches: Object.values(s.pitches).sort((a, b) => a.seat - b.seat),
    winnerSeat, fits, verdicts, sideVotes: { ...s.sideVotes }, pointsDelta: delta,
  };

  return { ...s, phase: "REVEAL", scores, seenItUsed, results: [...s.results, result] };
}

// ---- Per-seat projection (spec §4): nothing renders except through this. ----

export interface SeatView {
  phase: GameState["phase"];
  mode: GameState["mode"];
  round: number;
  customer: number;
  contract: Contract | null;
  seats: { index: number; kind: "human" | "bot" | "hidden" | "machine" | "ghost";
           handle: string; persona?: string; hiddenLabel?: string; score: number }[];
  you: number;
  yourHand: number[];
  yourPitchSubmitted: boolean;
  seenItAvailable: boolean;
  /** During voting/reveal: pitches visible to everyone. Lanes only after reveal. */
  pitches: { seat: number; tmdbId: number; text: string; seenIt: boolean;
             lane: Lane | null }[];
  customerPick: number | null;
  lastResult: RoundResult | null;
  /** Seat whose Seen It verdict question is still open this reveal, else null. */
  seenItPending: number | null;
  yourSideVoteCast: boolean;
  accusationDone: boolean;
  screening: GameState["screening"];
  scores: Record<number, number>;
}

export function viewFor(s: GameState, seat: number): SeatView {
  const revealed = s.phase === "REVEAL" || s.phase === "OVERRULE";
  const votable = s.phase === "VOTING_CUSTOMER" || s.phase === "VOTING_SIDE" || revealed;
  const hideProvenance = s.mode === "replicant" && s.phase !== "RESULTS";
  return {
    phase: s.phase,
    mode: s.mode,
    round: s.round,
    customer: s.customer,
    contract: s.contract,
    seats: s.seats.map((x) => ({
      index: x.index,
      kind: x.kind === "human" ? "human"
        : x.kind === "bot" ? "bot"
        : hideProvenance ? "hidden"
        : x.kind,
      handle: hideProvenance && (x.kind === "machine" || x.kind === "ghost")
        ? `Seat ${x.hiddenLabel ?? "?"}` : x.handle,
      persona: x.kind === "bot" ? x.persona : undefined,
      hiddenLabel: x.hiddenLabel,
      score: s.scores[x.index] ?? 0,
    })),
    you: seat,
    yourHand: s.hands[seat] ?? [],
    yourPitchSubmitted: !!s.pitches[seat],
    seenItAvailable: !s.seenItUsed[seat],
    pitches: votable
      ? Object.values(s.pitches)
          .sort((a, b) => a.seat - b.seat)
          .map((p) => ({
            seat: p.seat, tmdbId: p.tmdbId, text: p.text, seenIt: p.seenIt,
            lane: revealed ? p.lane : null,
          }))
      : [],
    customerPick: s.customerPick,
    lastResult: revealed ? s.results[s.results.length - 1] ?? null : null,
    seenItPending: revealed && !s.seenItVerdict
      ? Object.values(s.pitches).find((p) => p.seenIt)?.seat ?? null
      : null,
    yourSideVoteCast: seat in s.sideVotes,
    accusationDone: seat in s.accusations,
    screening: s.screening,
    scores: { ...s.scores },
  };
}
