// Match director: drives the pure reducer with timers, bot scheduling,
// device-flow sequencing (solo / hotseat pass / replicant), signal
// emission, and match persistence. The UI talks to this, never to the
// reducer directly; rendering still goes through viewFor (spec §4).

import {
  HiddenSeatPolicy, PERSONAS, chooseCard, chooseCustomerPick, chooseLane,
  chooseSideVote, fallbackPitch, ghostPitch, machinePitch, templatePitch,
} from "./core/bots";
import { TIMERS, RULES } from "./core/config";
import { NEUTRAL_VECTOR, fitPct, meanVector, toVector } from "./core/contracts";
import { initialState, reduce, viewFor, type Action, type SeatView } from "./core/reducer";
import { instanceId, int, pick, stream } from "./core/rng";
import type {
  BotSkill, Chip, GameState, Lane, MatchSummary, Mode, Movie, Profile, Seat,
} from "./core/types";
import type { MovieSource } from "./data/movieSource";
import type { AuthProvider, ScoreStore } from "./identity/identity";
import type { SignalSink } from "./signals/sink";
import type { KVStore } from "./storage";
import { CriticVoice, revealEvent, type CriticEvent } from "./ui/critic";

export type TurnPurpose =
  | "pitch" | "custpick" | "sidevote" | "accuse" | "scrpitch" | "scrvote";

export type DeviceFlow =
  | { kind: "table" }                        // shared table view
  | { kind: "mood" }                         // contract interstitial, tap to begin
  | { kind: "pass"; to: number }             // hand the device to seat
  | { kind: "private"; seat: number; purpose: TurnPurpose };

export interface TimerInfo {
  endsAt: number;
  durationMs: number;
  paused: boolean;
  remainingAtPause: number;
}

export interface Scheduler {
  set(fn: () => void, ms: number): number;
  clear(id: number): void;
  now(): number;
}

export const realScheduler: Scheduler = {
  set: (fn, ms) => window.setTimeout(fn, ms),
  clear: (id) => window.clearTimeout(id),
  now: () => Date.now(),
};

export interface MatchConfig {
  mode: Mode;
  humans: { profileId: string; handle: string; portraitSeed: number }[];
  seed?: string;
  /** Tests only: pin which hidden seat is the Machine (replicant). */
  machineSeatOverride?: 2 | 3;
}

interface SavedMatch {
  state: GameState;
  counter: number;
  ghostUsed: string[];
  portraits: Record<number, number>;
}

const SAVE_KEY = "match";
const REVEAL_DWELL_MS = 2600;

type CriticListener = (event: CriticEvent, line: string) => void;

export class Director {
  state: GameState = initialState();
  device: DeviceFlow = { kind: "table" };
  timer: TimerInfo | null = null;
  /** portraitSeed per seat for rendering (humans; bots use persona seeds). */
  portraits: Record<number, number> = {};

  private counter = 0;
  private ghostUsed = new Set<string>();
  private queue: { seat: number; purpose: TurnPurpose }[] = [];
  private turn: { seat: number; purpose: TurnPurpose } | null = null;
  private timerId: number | null = null;
  private pending: number[] = [];
  private phaseKey = "";
  private changeListeners: (() => void)[] = [];
  private criticListeners: CriticListener[] = [];
  private critic: CriticVoice;
  private screeningFetch = false;
  private summariesWritten = false;

  constructor(
    private source: MovieSource,
    private sink: SignalSink,
    private auth: AuthProvider,
    private scoreStore: ScoreStore,
    private store: KVStore,
    private sched: Scheduler = realScheduler,
  ) {
    this.critic = new CriticVoice(() => Math.random());
  }

  // ---- listeners ----

  onChange(fn: () => void): void { this.changeListeners.push(fn); }
  onCritic(fn: CriticListener): void { this.criticListeners.push(fn); }
  private notify(): void { for (const fn of this.changeListeners) fn(); }
  say(event: CriticEvent): void {
    const line = this.critic.line(event);
    for (const fn of this.criticListeners) fn(event, line);
  }

  // ---- accessors for the UI ----

  movie(id: number): Movie | undefined { return this.source.byId(id); }
  view(seat: number): SeatView { return viewFor(this.state, seat); }
  humanSeats(): number[] {
    return this.state.seats.filter((s) => s.kind === "human").map((s) => s.index);
  }
  get inMatch(): boolean {
    return this.state.phase !== "LOBBY";
  }
  activeTurn(): { seat: number; purpose: TurnPurpose } | null { return this.turn; }
  hiddenSeatLetters(): { seat: number; label: string }[] {
    return this.state.seats
      .filter((s) => s.kind === "machine" || s.kind === "ghost")
      .map((s) => ({ seat: s.index, label: s.hiddenLabel ?? "?" }));
  }

  // ---- match lifecycle ----

  async startMatch(config: MatchConfig): Promise<void> {
    const seed = config.seed ?? instanceId();
    const matchId = instanceId();
    const seats = this.buildSeats(config, matchId);
    const deckMovies = await this.source.dealPool(64, { seed });
    const deck = deckMovies.map((m) => m.tmdb_id);
    let machineSeat: number | null = null;
    let ghostSeat: number | null = null;
    for (const s of seats) {
      if (s.kind === "machine") machineSeat = s.index;
      if (s.kind === "ghost") ghostSeat = s.index;
    }
    this.counter = 0;
    this.ghostUsed.clear();
    this.summariesWritten = false;
    this.dispatch({
      type: "START_MATCH", matchId, seed, mode: config.mode,
      seats, deck, machineSeat, ghostSeat,
    });
    this.say("matchStart");
  }

  private buildSeats(config: MatchConfig, matchId: string): Seat[] {
    const seats: Seat[] = [];
    const letters = ["A", "B", "C", "D"];
    this.portraits = {};
    config.humans.forEach((h, i) => {
      seats.push({ index: i, kind: "human", handle: h.handle, profileId: h.profileId });
      this.portraits[i] = h.portraitSeed;
    });
    if (config.mode === "replicant") {
      // Hidden seats: openly device-less. Machine assignment from host
      // entropy so a reused seed cannot reveal it (§8.1 spirit).
      const machineIsC = config.machineSeatOverride != null
        ? config.machineSeatOverride === 2
        : instanceId().charCodeAt(0) % 2 === 0;
      seats.push({
        index: 2, kind: machineIsC ? "machine" : "ghost",
        handle: "Seat C", hiddenLabel: "C", persona: machineIsC ? "machine" : undefined,
      });
      seats.push({
        index: 3, kind: machineIsC ? "ghost" : "machine",
        handle: "Seat D", hiddenLabel: "D", persona: machineIsC ? undefined : "machine",
      });
    } else {
      const fill: { persona: string; skill: BotSkill }[] = [
        { persona: "marla", skill: "hard" },
        { persona: "dev", skill: "normal" },
        { persona: "bucket", skill: "easy" },
      ];
      let f = 0;
      for (let i = seats.length; i < RULES.seats; i++) {
        const b = fill[f++];
        seats.push({
          index: i, kind: "bot", handle: PERSONAS[b.persona].name,
          persona: b.persona, skill: b.skill,
        });
        this.portraits[i] = PERSONAS[b.persona].portraitSeed;
      }
    }
    void matchId;
    seats.forEach((s) => { s.hiddenLabel = s.hiddenLabel ?? letters[s.index]; });
    return seats;
  }

  abandonMatch(): void {
    this.clearAllTimers();
    this.state = initialState();
    this.device = { kind: "table" };
    this.turn = null;
    this.queue = [];
    this.phaseKey = "";
    this.store.remove(SAVE_KEY);
    this.notify();
  }

  // ---- persistence (match-in-progress resume, §10.1) ----

  hasSavedMatch(): boolean {
    return this.store.get<SavedMatch>(SAVE_KEY) != null;
  }

  resume(): boolean {
    const saved = this.store.get<SavedMatch>(SAVE_KEY);
    if (!saved) return false;
    this.state = saved.state;
    this.counter = saved.counter;
    this.ghostUsed = new Set(saved.ghostUsed);
    this.portraits = saved.portraits;
    this.phaseKey = "";
    this.summariesWritten = false;
    this.drive();
    this.notify();
    return true;
  }

  private save(): void {
    if (this.state.phase === "LOBBY" || this.state.phase === "RESULTS") {
      this.store.remove(SAVE_KEY);
      return;
    }
    const saved: SavedMatch = {
      state: this.state, counter: this.counter,
      ghostUsed: [...this.ghostUsed], portraits: this.portraits,
    };
    this.store.set(SAVE_KEY, saved);
  }

  // ---- dispatch + signal emission ----

  private ctx = { movie: (id: number) => this.source.byId(id) };

  private dispatch(a: Action): void {
    const prev = this.state;
    const next = reduce(prev, a, this.ctx);
    if (next === prev) return;
    this.state = next;
    this.emitSignals(prev, a);
    this.save();
    this.drive();
    this.notify();
  }

  private envelope(actorSeat: number, event: object): void {
    const kind = this.state.seats[actorSeat]?.kind ?? "human";
    this.sink.emit({
      envelope_version: 1,
      event_id: `${this.state.matchId}-r${this.state.round}-e${this.counter++}`,
      match_id: this.state.matchId,
      round: this.state.round,
      ts: this.sched.now(),
      dataset_version: this.source.datasetVersion(),
      actor: { seat: actorSeat, kind },
      event: event as never,
    });
  }

  private emitSignals(prev: GameState, a: Action): void {
    const contract = prev.contract;
    if (!contract) return;
    const fitOf = (tmdbId: number): number => {
      const m = this.source.byId(tmdbId);
      return m ? fitPct(contract, m.mood) : 0;
    };
    if (a.type === "CUSTOMER_PICK") {
      const picked = prev.pitches[a.pitchSeat];
      this.envelope(prev.customer, {
        type: "customer_pick", tmdb_id: picked.tmdbId, contract,
        fit_pct: fitOf(picked.tmdbId),
        candidates: Object.values(prev.pitches)
          .sort((x, y) => x.seat - y.seat)
          .map((p) => ({ tmdb_id: p.tmdbId, fit_pct: fitOf(p.tmdbId) })),
        pitch_text: picked.text,
      });
    } else if (a.type === "SIDE_VOTE" && a.target !== -1) {
      const voted = prev.pitches[a.target];
      this.envelope(a.voter, {
        type: "side_vote", tmdb_id: voted.tmdbId, contract,
        eligible: Object.values(prev.pitches)
          .filter((p) => p.seat !== a.voter)
          .sort((x, y) => x.seat - y.seat)
          .map((p) => ({ tmdb_id: p.tmdbId, fit_pct: fitOf(p.tmdbId) })),
      });
    } else if (a.type === "OVERRULE") {
      const winner = prev.pitches[prev.customerPick!];
      this.envelope(a.seat, {
        type: "overrule", tmdb_id: winner.tmdbId, contract,
        fit_pct: fitOf(winner.tmdbId), chip: a.chip,
      });
      if (this.state.overrules.length === 2) this.say("flustered");
      else this.say("overrule");
    } else if (a.type === "SEEN_IT_VERDICT") {
      const p = prev.pitches[a.seat];
      this.envelope(a.seat, {
        type: "seen_it_verdict", tmdb_id: p.tmdbId, contract,
        fit_pct: fitOf(p.tmdbId), verdict_agrees: a.agrees, chip: a.chip,
      });
    }
  }

  // ---- phase driver ----

  private drive(): void {
    const s = this.state;
    // MOOD -> PITCHING is one logical phase (the pitch queue spans it);
    // the screening flag marks SET_SCREENING landing inside one phase.
    const group = s.phase === "PITCHING" ? "MOOD" : s.phase;
    const key = `${group}:${s.round}:${s.screening ? 1 : 0}`;
    if (key === this.phaseKey) return;
    this.phaseKey = key;
    this.clearAllTimers();
    this.turn = null;
    this.queue = [];

    switch (s.phase) {
      case "MOOD":
      case "PITCHING": {
        // PITCHING is only entered here on resume; filters keep it safe.
        this.device = { kind: "mood" };
        // Bots and hidden seats pitch on their own clocks right away.
        for (const seat of s.seats) {
          if (seat.index === s.customer || seat.kind === "human") continue;
          if (s.pitches[seat.index]) continue;
          this.scheduleBotPitch(seat.index);
        }
        this.queue = this.humanSeats()
          .filter((i) => i !== s.customer && !s.pitches[i])
          .map((seat) => ({ seat, purpose: "pitch" as TurnPurpose }));
        break;
      }
      case "VOTING_CUSTOMER": {
        const customer = s.seats[s.customer];
        if (customer.kind === "human") {
          this.queue = [{ seat: s.customer, purpose: "custpick" }];
          this.startNextTurn();
        } else {
          this.scheduleBotAction(s.customer, () => {
            const st = this.state;
            if (st.phase !== "VOTING_CUSTOMER") return;
            const pickSeat = customer.kind === "bot"
              ? chooseCustomerPick(customer.skill ?? "normal", st, this.ctx.movie)
              : HiddenSeatPolicy.chooseCustomerPick(st);
            this.dispatch({ type: "CUSTOMER_PICK", pitchSeat: pickSeat, auto: false });
          });
          this.device = { kind: "table" };
        }
        break;
      }
      case "VOTING_SIDE": {
        for (const seat of s.seats) {
          if (seat.index === s.customer || seat.kind === "human") continue;
          if (!(seat.index in s.pitches)) continue;
          this.scheduleBotAction(seat.index, () => {
            const st = this.state;
            if (st.phase !== "VOTING_SIDE") return;
            const target = seat.kind === "bot"
              ? chooseSideVote(seat.skill ?? "normal", st, seat.index, this.ctx.movie)
              : HiddenSeatPolicy.chooseSideVote(st, seat.index, this.ctx.movie);
            this.dispatch({ type: "SIDE_VOTE", voter: seat.index, target });
          });
        }
        this.queue = this.humanSeats()
          .filter((i) => i !== s.customer && i in s.pitches)
          .map((seat) => ({ seat, purpose: "sidevote" as TurnPurpose }));
        this.startNextTurn();
        break;
      }
      case "REVEAL": {
        this.device = { kind: "table" };
        const r = s.results[s.results.length - 1];
        if (r) {
          const winner = r.pitches.find((p) => p.seat === r.winnerSeat)!;
          this.say(revealEvent(winner.lane, r.verdicts[r.winnerSeat]));
        }
        this.pending.push(this.sched.set(() => {
          this.dispatch({ type: "OVERRULE_OPEN" });
        }, REVEAL_DWELL_MS));
        break;
      }
      case "OVERRULE": {
        this.device = { kind: "table" };
        this.setTimer(TIMERS.overruleMs, () => this.dispatch({ type: "ADVANCE" }));
        break;
      }
      case "ACCUSATION": {
        this.queue = this.humanSeats().map((seat) => ({ seat, purpose: "accuse" as TurnPurpose }));
        this.startNextTurn();
        break;
      }
      case "SCREENING_PITCH": {
        if (!s.screening && !this.screeningFetch) {
          this.screeningFetch = true;
          void this.setupScreening();
          this.device = { kind: "table" };
          break;
        }
        this.screeningFetch = false;
        this.say("finale");
        for (const seat of s.seats) {
          if (seat.kind === "human") continue;
          this.scheduleBotAction(seat.index, () => {
            const st = this.state;
            if (st.phase !== "SCREENING_PITCH" || !st.screening) return;
            const movie = this.ctx.movie(st.screening.candidates[seat.index]);
            if (!movie) return;
            const rng = stream(st.seed, "scrpitch", seat.index);
            const text = seat.kind === "machine" ? machinePitch(movie, rng)
              : seat.kind === "ghost" ? ghostPitch(st.contract!, this.ghostUsed, rng)
              : templatePitch(seat.persona ?? "dev", movie, rng);
            if (seat.kind === "ghost") this.ghostUsed.add(text);
            this.dispatch({ type: "SCREENING_PITCH_SUBMIT", seat: seat.index, text });
          });
        }
        this.queue = this.humanSeats().map((seat) => ({ seat, purpose: "scrpitch" as TurnPurpose }));
        this.startNextTurn();
        break;
      }
      case "SCREENING_VOTE": {
        for (const seat of s.seats) {
          if (seat.kind === "human") continue;
          this.scheduleBotAction(seat.index, () => {
            const st = this.state;
            if (st.phase !== "SCREENING_VOTE" || !st.screening) return;
            const others = st.seats.map((x) => x.index).filter((i) => i !== seat.index);
            const target = pick(stream(st.seed, "scrvote", seat.index), others);
            this.dispatch({ type: "SCREENING_VOTE", voter: seat.index, target });
          });
        }
        this.queue = this.humanSeats().map((seat) => ({ seat, purpose: "scrvote" as TurnPurpose }));
        this.startNextTurn();
        break;
      }
      case "RESULTS": {
        this.device = { kind: "table" };
        this.store.remove(SAVE_KEY);
        if (s.mode === "replicant") {
          const anyCorrect = Object.entries(s.accusations)
            .some(([, target]) => target === s.machineSeat);
          this.say(anyCorrect ? "accuseCorrect" : "accuseWrong");
          const machineScore = s.scores[s.machineSeat ?? -1] ?? -1;
          const maxScore = Math.max(...Object.values(s.scores));
          if (!anyCorrect && machineScore === maxScore) this.say("employeeOfMonth");
        }
        this.say("results");
        void this.writeSummaries();
        break;
      }
    }
  }

  /** Called by the UI when the table has read the contract. */
  confirmMood(): void {
    if (this.state.phase !== "MOOD" || this.device.kind !== "mood") return;
    this.startNextTurn();
  }

  /** Called by the UI from the PASS_DEVICE screen. Starts the timer (§4.2). */
  confirmPass(): void {
    if (this.device.kind !== "pass" || !this.turn) return;
    this.beginTurn();
  }

  private startNextTurn(): void {
    const next = this.queue.shift();
    if (!next) {
      this.turn = null;
      this.timer = null;
      this.device = { kind: "table" };
      this.notify();
      return;
    }
    this.turn = next;
    if (this.humanSeats().length > 1) {
      this.device = { kind: "pass", to: next.seat };
      this.timer = null;
      this.notify();
    } else {
      this.beginTurn();
    }
  }

  private beginTurn(): void {
    const t = this.turn!;
    this.device = { kind: "private", seat: t.seat, purpose: t.purpose };
    const durations: Record<TurnPurpose, number> = {
      pitch: TIMERS.pitchMs, custpick: TIMERS.customerPickMs,
      sidevote: TIMERS.sideVoteMs, accuse: 0,
      scrpitch: TIMERS.pitchMs, scrvote: TIMERS.sideVoteMs,
    };
    const ms = durations[t.purpose];
    if (ms > 0) this.setTimer(ms, () => this.autoAct(t.seat, t.purpose));
    else this.timer = null;
    this.notify();
  }

  private autoAct(seat: number, purpose: TurnPurpose): void {
    const s = this.state;
    if (purpose === "pitch" && (s.phase === "MOOD" || s.phase === "PITCHING")) {
      const hand = s.hands[seat] ?? [];
      if (hand.length > 0) {
        const id = pick(stream(s.seed, "autocard", s.round, seat), hand);
        const m = this.ctx.movie(id);
        this.say("pitchTimeout");
        this.dispatch({
          type: "SUBMIT_PITCH", seat, tmdbId: id, lane: "straight",
          seenIt: false, text: m ? fallbackPitch(m) : "This one. Trust me.", auto: true,
        });
      }
      this.advanceAfterHumanAct(seat, purpose);
    } else if (purpose === "custpick" && s.phase === "VOTING_CUSTOMER") {
      const seats = Object.values(s.pitches).map((p) => p.seat);
      this.say("customerTimeout");
      this.dispatch({
        type: "CUSTOMER_PICK",
        pitchSeat: pick(stream(s.seed, "autopick", s.round), seats), auto: true,
      });
      this.advanceAfterHumanAct(seat, purpose);
    } else if (purpose === "sidevote" && s.phase === "VOTING_SIDE") {
      this.dispatch({ type: "SIDE_VOTE", voter: seat, target: -1 }); // abstain
      this.advanceAfterHumanAct(seat, purpose);
    } else if (purpose === "scrpitch" && s.phase === "SCREENING_PITCH" && s.screening) {
      const m = this.ctx.movie(s.screening.candidates[seat]);
      this.say("pitchTimeout");
      this.dispatch({
        type: "SCREENING_PITCH_SUBMIT", seat,
        text: m ? fallbackPitch(m) : "It is the one on the left.",
      });
      this.advanceAfterHumanAct(seat, purpose);
    } else if (purpose === "scrvote" && s.phase === "SCREENING_VOTE") {
      const others = s.seats.map((x) => x.index).filter((i) => i !== seat);
      this.dispatch({
        type: "SCREENING_VOTE", voter: seat,
        target: pick(stream(s.seed, "autoscrvote", seat), others),
      });
      this.advanceAfterHumanAct(seat, purpose);
    }
  }

  /** After a human acts (or times out), move the device along. */
  private advanceAfterHumanAct(seat: number, purpose: TurnPurpose): void {
    if (this.turn && this.turn.seat === seat && this.turn.purpose === purpose) {
      this.clearTurnTimer();
      this.startNextTurn();
    }
  }

  // ---- human actions (called by the UI) ----

  submitPitch(seat: number, tmdbId: number, lane: Lane, seenIt: boolean, text: string): void {
    if (this.device.kind !== "private" || this.device.seat !== seat) return;
    this.dispatch({ type: "SUBMIT_PITCH", seat, tmdbId, lane, seenIt, text, auto: false });
    if (seenIt) this.say("seenItFlip");
    this.advanceAfterHumanAct(seat, "pitch");
  }

  customerPick(pitchSeat: number): void {
    this.dispatch({ type: "CUSTOMER_PICK", pitchSeat, auto: false });
    if (this.turn) this.advanceAfterHumanAct(this.turn.seat, "custpick");
  }

  sideVote(voter: number, target: number): void {
    this.dispatch({ type: "SIDE_VOTE", voter, target });
    this.advanceAfterHumanAct(voter, "sidevote");
  }

  overrule(seat: number, chip: Chip | null): void {
    this.dispatch({ type: "OVERRULE", seat, chip });
  }

  seenItVerdict(seat: number, agrees: boolean, chip: Chip | null): void {
    this.dispatch({ type: "SEEN_IT_VERDICT", seat, agrees, chip });
  }

  accuse(seat: number, target: number): void {
    this.dispatch({ type: "ACCUSE", seat, target });
    this.advanceAfterHumanAct(seat, "accuse");
  }

  screeningPitch(seat: number, text: string): void {
    this.dispatch({ type: "SCREENING_PITCH_SUBMIT", seat, text });
    this.advanceAfterHumanAct(seat, "scrpitch");
  }

  screeningVote(voter: number, target: number): void {
    this.dispatch({ type: "SCREENING_VOTE", voter, target });
    this.advanceAfterHumanAct(voter, "scrvote");
  }

  skipOverrule(): void {
    if (this.state.phase === "OVERRULE") {
      this.clearTurnTimer();
      this.dispatch({ type: "ADVANCE" });
    }
  }

  // ---- timers ----

  private setTimer(ms: number, onExpiry: () => void): void {
    this.clearTurnTimer();
    this.timer = {
      endsAt: this.sched.now() + ms, durationMs: ms, paused: false, remainingAtPause: 0,
    };
    this.timerId = this.sched.set(() => {
      this.timerId = null;
      this.timer = null;
      onExpiry();
    }, ms);
    this.expiryFn = onExpiry;
  }

  private expiryFn: (() => void) | null = null;

  pauseTimer(): void {
    if (!this.timer || this.timer.paused || this.timerId == null) return;
    this.sched.clear(this.timerId);
    this.timerId = null;
    this.timer.paused = true;
    this.timer.remainingAtPause = Math.max(0, this.timer.endsAt - this.sched.now());
    this.notify();
  }

  resumeTimer(): void {
    if (!this.timer || !this.timer.paused || !this.expiryFn) return;
    const ms = this.timer.remainingAtPause;
    const fn = this.expiryFn;
    this.timer = {
      endsAt: this.sched.now() + ms, durationMs: this.timer.durationMs,
      paused: false, remainingAtPause: 0,
    };
    this.timerId = this.sched.set(() => {
      this.timerId = null;
      this.timer = null;
      fn();
    }, ms);
    this.notify();
  }

  private clearTurnTimer(): void {
    if (this.timerId != null) this.sched.clear(this.timerId);
    this.timerId = null;
    this.timer = null;
    this.expiryFn = null;
  }

  private clearAllTimers(): void {
    this.clearTurnTimer();
    for (const id of this.pending) this.sched.clear(id);
    this.pending = [];
  }

  // ---- bots ----

  /** Theatrical delay from a seeded stream: one distribution for every
   * non-human seat, so replicant hidden seats are trace-identical. */
  private botDelay(seat: number, scope: string): number {
    const rng = stream(this.state.seed, "delay", scope, this.state.round, seat);
    return int(rng, TIMERS.botThinkMinMs, TIMERS.botThinkMaxMs);
  }

  private scheduleBotAction(seat: number, fn: () => void): void {
    this.pending.push(this.sched.set(fn, this.botDelay(seat, this.state.phase)));
  }

  private scheduleBotPitch(seat: number): void {
    this.pending.push(this.sched.set(() => {
      const s = this.state;
      if (s.phase !== "MOOD" && s.phase !== "PITCHING") return;
      if (s.pitches[seat] || seat === s.customer) return;
      const seatObj = s.seats[seat];
      const hidden = seatObj.kind === "machine" || seatObj.kind === "ghost";
      const card = hidden
        ? HiddenSeatPolicy.chooseCard(s, seat, this.ctx.movie)
        : chooseCard(seatObj.skill ?? "normal", s, seat, this.ctx.movie);
      const lane: Lane = hidden
        ? HiddenSeatPolicy.chooseLane(s, seat, card, this.ctx.movie)
        : chooseLane(seatObj.skill ?? "normal", s, seat, card, this.ctx.movie);
      const movie = this.ctx.movie(card);
      const rng = stream(s.seed, "pitchtext", s.round, seat);
      let text: string;
      if (seatObj.kind === "machine") text = movie ? machinePitch(movie, rng) : "this one";
      else if (seatObj.kind === "ghost") {
        text = ghostPitch(s.contract!, this.ghostUsed, rng);
        this.ghostUsed.add(text);
      } else text = movie ? templatePitch(seatObj.persona ?? "dev", movie, rng) : "This one.";
      this.dispatch({
        type: "SUBMIT_PITCH", seat, tmdbId: card, lane, seenIt: false, text, auto: false,
      });
    }, this.botDelay(seat, "pitch")));
  }

  // ---- screening + results ----

  tableMoodVector(): number[] {
    const weighted: number[][] = [];
    for (const r of this.state.results) {
      const winner = r.pitches.find((p) => p.seat === r.winnerSeat);
      if (!winner) continue;
      const m = this.ctx.movie(winner.tmdbId);
      if (!m) continue;
      const v = toVector(m.mood);
      const laneMatched =
        (winner.lane === "straight" && r.verdicts[r.winnerSeat] === "TRUE_FIT") ||
        (winner.lane === "balderdash" && r.verdicts[r.winnerSeat] === "MISFIT");
      weighted.push(v);
      if (laneMatched) weighted.push(v); // 2x weight when the lane bonus paid
    }
    return meanVector(weighted) ?? NEUTRAL_VECTOR;
  }

  private async setupScreening(): Promise<void> {
    const near = this.tableMoodVector();
    const candidates = await this.source.screeningPool(near, RULES.seats);
    const ids = shuffleIds(candidates.map((m) => m.tmdb_id), this.state.seed);
    this.dispatch({ type: "SET_SCREENING", candidates: ids });
  }

  /** Per-seat tonight vector (§9): mean of vectors of pitches they voted for. */
  tonightVector(seat: number): number[] | null {
    const vs: number[][] = [];
    for (const r of this.state.results) {
      const votedSeat = r.customer === seat ? r.winnerSeat : r.sideVotes[seat];
      if (votedSeat == null || votedSeat === -1) continue;
      const p = r.pitches.find((x) => x.seat === votedSeat);
      if (!p) continue;
      const m = this.ctx.movie(p.tmdbId);
      if (m) vs.push(toVector(m.mood));
    }
    return meanVector(vs);
  }

  async archivePicks(vector: number[] | null, count: number): Promise<Movie[]> {
    return this.source.screeningPool(vector ?? NEUTRAL_VECTOR, count);
  }

  private async writeSummaries(): Promise<void> {
    if (this.summariesWritten) return;
    this.summariesWritten = true;
    const s = this.state;
    const maxScore = Math.max(...Object.values(s.scores));
    for (const seat of s.seats) {
      if (seat.kind !== "human" || !seat.profileId) continue;
      let straight = 0, balderdash = 0, fullB = 0, failedB = 0;
      for (const r of s.results) {
        const p = r.pitches.find((x) => x.seat === seat.index);
        if (!p) continue;
        if (p.lane === "straight") straight++;
        else {
          balderdash++;
          if (r.verdicts[seat.index] === "MISFIT") fullB++;
          if (r.verdicts[seat.index] === "TRUE_FIT") failedB++;
        }
      }
      const summary: MatchSummary = {
        matchId: s.matchId,
        endedAt: this.sched.now(),
        mode: s.mode,
        seats: s.seats.map((x) => ({
          handle: x.handle, kind: x.kind, score: s.scores[x.index] ?? 0,
        })),
        profileSeat: seat.index,
        won: (s.scores[seat.index] ?? 0) === maxScore,
        laneStats: { straight, balderdash, fullBalderdash: fullB, failedBalderdash: failedB },
        seenItUsed: !!s.seenItUsed[seat.index],
        accusation: s.mode === "replicant" ? {
          made: seat.index in s.accusations,
          correct: s.accusations[seat.index] === s.machineSeat,
        } : undefined,
        tonightVector: this.tonightVector(seat.index) ?? [],
      };
      await this.scoreStore.recordMatch(seat.profileId, summary);
    }
  }

  // exposed for the results screen / profile flows
  get authProvider(): AuthProvider { return this.auth; }
  get scores(): ScoreStore { return this.scoreStore; }

  async activeProfile(): Promise<Profile | null> { return this.auth.current(); }
}

function shuffleIds(ids: number[], seed: string): number[] {
  const rng = stream(seed, "scrdeal");
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
