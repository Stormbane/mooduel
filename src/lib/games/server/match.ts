/**
 * Card-game PvP on the Phase 3 match skeleton. The skeleton owns seats,
 * turn order, versioning, idempotency, deadlines, forfeit; this module
 * owns mooduel-v1 legality and trick resolution, called only from
 * service-role routes.
 *
 * Async mapping ("mooduel-v1-pvp"):
 * - Sealed draft: each seat secretly picks 8 from a sealed 12 (written to
 *   match_secrets before any move), so the draft costs zero turns.
 * - Bundled turns: every move follows the open trick and counter-leads
 *   the next — 9 moves for 8 tricks, leads alternate seats 4–4.
 * - match_moves is publicly readable, so committed cards never ride in
 *   move payloads: they sit in match_secrets until the trick resolves,
 *   then both cards publish into config.resolved.
 */
import { serviceClient } from "./service-client";
import { dealDeck, type DeckMovie } from "./pool";
import {
  CATEGORIES,
  TRICKS,
  HAND_SIZE,
  toCardScore,
  type Category,
} from "../card-game";

export const PVP_RULES = "mooduel-v1-pvp";
const SEALED_SIZE = 12;

interface Identity {
  userId: string | null;
  sessionId: string | null;
}

interface SeatSecrets {
  cards: number[];
  pending: number | null;
}

export interface ResolvedTrick {
  category: Category;
  leaderSeat: 1 | 2;
  cardBySeat: Record<"1" | "2", number>;
  winnerSeat: 1 | 2 | 0; // 0 = draw
  margin: number;
}

interface MatchConfig {
  rules: string;
  deal: DeckMovie[];
  resolved: ResolvedTrick[];
  pending: { category: Category; leaderSeat: 1 | 2 } | null;
}

export interface MatchStateView {
  code: string;
  status: string;
  stateVersion: number;
  currentTurn: number | null;
  turnDeadline: string | null;
  winnerSeat: number | null;
  rules: string;
  deal: DeckMovie[];
  resolved: ResolvedTrick[];
  pendingCategory: Category | null;
  pendingLeaderSeat: number | null;
  seats: { seat: number; taken: boolean }[];
  yourSeat: number | null;
  yourSealed: number[] | null;
  yourHand: number[] | null;
  yourPending: number | null;
  handsSet: { 1: boolean; 2: boolean };
}

const idParams = (id: Identity) => ({ p_user: id.userId, p_session: id.sessionId });

function cardScore(deal: DeckMovie[], cardId: number, c: Category): number {
  const m = deal.find((d) => d.tmdb_id === cardId);
  return m ? toCardScore(c, m.dims[c]) : 0;
}

/** Create a card-game match: deal 24, seal 12 per seat, return the code. */
export async function createCardMatch(id: Identity): Promise<{ matchId: string; code: string }> {
  const deal = await dealDeck(SEALED_SIZE * 2);
  const config: MatchConfig = { rules: PVP_RULES, deal, resolved: [], pending: null };

  const { data, error } = await serviceClient.rpc("create_match", {
    p_game: "card-game",
    p_config: config,
    ...idParams(id),
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  const matchId = row.match_id as string;
  const code = row.code as string;

  const shuffled = [...deal].sort(() => Math.random() - 0.5);
  const sealed1 = shuffled.slice(0, SEALED_SIZE).map((m) => m.tmdb_id);
  const sealed2 = shuffled.slice(SEALED_SIZE).map((m) => m.tmdb_id);
  const { error: sErr } = await serviceClient.from("match_secrets").insert([
    { match_id: matchId, seat: 1, deck: sealed1, hand: { cards: [], pending: null } },
    { match_id: matchId, seat: 2, deck: sealed2, hand: { cards: [], pending: null } },
  ]);
  if (sErr) throw new Error(sErr.message);

  return { matchId, code };
}

export async function joinCardMatch(code: string, id: Identity): Promise<void> {
  const { error } = await serviceClient.rpc("join_match", {
    p_code: code,
    ...idParams(id),
    p_as_bot: false,
  });
  if (error) throw new Error(error.message);
}

async function loadMatch(code: string) {
  const { data: match, error } = await serviceClient
    .from("matches")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!match) throw new Error("unknown match");
  const { data: players, error: pErr } = await serviceClient
    .from("match_players")
    .select("seat,user_id,session_id")
    .eq("match_id", match.id);
  if (pErr) throw new Error(pErr.message);
  const { data: secrets, error: sErr } = await serviceClient
    .from("match_secrets")
    .select("seat,hand,deck")
    .eq("match_id", match.id);
  if (sErr) throw new Error(sErr.message);
  return { match, players: players ?? [], secrets: secrets ?? [] };
}

function seatOf(
  players: { seat: number; user_id: string | null; session_id: string | null }[],
  id: Identity,
): number | null {
  for (const p of players) {
    if (id.userId && p.user_id === id.userId) return p.seat;
    if (id.sessionId && p.session_id === id.sessionId) return p.seat;
  }
  return null;
}

export async function getMatchState(code: string, id: Identity): Promise<MatchStateView> {
  const { match, players, secrets } = await loadMatch(code);
  const config = match.config as MatchConfig;
  const yourSeat = seatOf(players, id);
  const mySecrets = secrets.find((s) => s.seat === yourSeat);
  const hand = (mySecrets?.hand ?? null) as SeatSecrets | null;
  const handOf = (seat: number): SeatSecrets =>
    ((secrets.find((s) => s.seat === seat)?.hand ?? { cards: [], pending: null }) as SeatSecrets);

  const started = config.resolved.length > 0 || config.pending !== null;

  return {
    code,
    status: match.status,
    stateVersion: match.state_version,
    currentTurn: match.current_turn,
    turnDeadline: match.turn_deadline,
    winnerSeat: match.winner_seat,
    rules: config.rules,
    deal: config.deal,
    resolved: config.resolved,
    pendingCategory: config.pending?.category ?? null,
    pendingLeaderSeat: config.pending?.leaderSeat ?? null,
    seats: [1, 2].map((seat) => ({ seat, taken: players.some((p) => p.seat === seat) })),
    yourSeat,
    yourSealed:
      yourSeat && !started && (hand?.cards.length ?? 0) === 0
        ? ((mySecrets?.deck ?? []) as number[])
        : null,
    yourHand: yourSeat ? (hand?.cards ?? []) : null,
    yourPending: yourSeat ? (hand?.pending ?? null) : null,
    handsSet: {
      1: handOf(1).cards.length > 0 || config.resolved.length > 0 || config.pending !== null,
      2: handOf(2).cards.length > 0 || config.resolved.length > 0 || config.pending !== null,
    },
  };
}

/** Sealed draft: pick exactly 8 of your sealed 12. Costs no turn. */
export async function pickHand(code: string, id: Identity, cardIds: number[]): Promise<void> {
  const { match, players, secrets } = await loadMatch(code);
  const config = match.config as MatchConfig;
  const seat = seatOf(players, id);
  if (!seat) throw new Error("not a participant");
  if (config.resolved.length > 0 || config.pending) throw new Error("match already underway");

  const mine = secrets.find((s) => s.seat === seat);
  if (!mine) throw new Error("no sealed deck");
  const current = mine.hand as SeatSecrets;
  if (current.cards.length > 0) throw new Error("hand already picked");

  const sealed = new Set(mine.deck as number[]);
  const unique = [...new Set(cardIds)];
  if (unique.length !== HAND_SIZE || !unique.every((c) => sealed.has(c))) {
    throw new Error(`pick exactly ${HAND_SIZE} cards from your sealed twelve`);
  }

  const { error } = await serviceClient
    .from("match_secrets")
    .update({ hand: { cards: unique, pending: null } })
    .eq("match_id", match.id)
    .eq("seat", seat);
  if (error) throw new Error(error.message);
}

export interface TurnInput {
  expectedVersion: number;
  idempotencyKey: string;
  follow?: { cardId: number };
  lead?: { category: Category; cardId: number };
}

/**
 * One bundled turn: follow the open trick (if any) and counter-lead the
 * next (unless the follow closes trick 8). Validates against the engine
 * rules, then defers concurrency to submit_move.
 */
export async function playTurn(
  code: string,
  id: Identity,
  input: TurnInput,
): Promise<{ status: string; state?: MatchStateView }> {
  const { match, players, secrets } = await loadMatch(code);
  const config = match.config as MatchConfig;
  const seat = seatOf(players, id) as 1 | 2 | null;
  if (!seat) return { status: "not-a-participant" };
  if (match.status !== "active") return { status: `match-not-active:${match.status}` };

  const mine = secrets.find((s) => s.seat === seat)!;
  const theirs = secrets.find((s) => s.seat !== seat)!;
  const myHand = mine.hand as SeatSecrets;
  const theirHand = theirs.hand as SeatSecrets;

  if (myHand.cards.length === 0 && config.resolved.length === 0 && !config.pending) {
    return { status: "pick-your-hand-first" };
  }
  if (
    config.resolved.length === 0 &&
    !config.pending &&
    (theirHand.cards.length === 0)
  ) {
    return { status: "opponent-still-drafting" };
  }

  // --- game-level legality ---
  const remaining = new Set(myHand.cards);
  let followCard: number | null = null;

  if (config.pending) {
    if (config.pending.leaderSeat === seat) return { status: "you-led-this-trick" };
    if (!input.follow) return { status: "follow-required" };
    if (!remaining.has(input.follow.cardId)) return { status: "card-not-in-hand" };
    followCard = input.follow.cardId;
    remaining.delete(followCard);
  } else if (input.follow) {
    return { status: "nothing-to-follow" };
  }

  const resolvedAfterFollow = config.resolved.length + (followCard !== null ? 1 : 0);
  const mustLead = resolvedAfterFollow < TRICKS;

  if (mustLead) {
    if (!input.lead) return { status: "lead-required" };
    const used = new Set<Category>([
      ...config.resolved.map((r) => r.category),
      ...(config.pending ? [config.pending.category] : []),
    ]);
    if (!CATEGORIES.includes(input.lead.category) || used.has(input.lead.category)) {
      return { status: "category-not-available" };
    }
    if (!remaining.has(input.lead.cardId)) return { status: "card-not-in-hand" };
  } else if (input.lead) {
    return { status: "match-is-over-after-this-follow" };
  }

  // --- the skeleton is the gate: submit the public move first ---
  const { data, error } = await serviceClient.rpc("submit_move", {
    p_match: match.id,
    ...idParams(id),
    p_expected_version: input.expectedVersion,
    p_idempotency_key: input.idempotencyKey,
    p_move: { t: "turn", category: input.lead?.category ?? null },
  });
  if (error) return { status: `rpc-error:${error.message}` };
  const row = Array.isArray(data) ? data[0] : data;
  if (row.status !== "accepted") return { status: row.status as string };

  // --- accepted: apply secrets + public trick state ---
  const newResolved = [...config.resolved];
  let newPending: MatchConfig["pending"] = config.pending;
  let theirNewHand = theirHand;

  if (followCard !== null && config.pending) {
    const leaderCard = theirHand.pending!;
    const c = config.pending.category;
    const leaderScore = cardScore(config.deal, leaderCard, c);
    const followScore = cardScore(config.deal, followCard, c);
    const winnerSeat =
      leaderScore === followScore ? 0 : leaderScore > followScore ? config.pending.leaderSeat : seat;
    newResolved.push({
      category: c,
      leaderSeat: config.pending.leaderSeat,
      cardBySeat: {
        [String(config.pending.leaderSeat)]: leaderCard,
        [String(seat)]: followCard,
      } as Record<"1" | "2", number>,
      winnerSeat: winnerSeat as 1 | 2 | 0,
      margin: Math.abs(leaderScore - followScore),
    });
    newPending = null;
    theirNewHand = { ...theirHand, pending: null };
  }

  let myPending: number | null = null;
  if (input.lead && mustLead) {
    myPending = input.lead.cardId;
    newPending = { category: input.lead.category, leaderSeat: seat };
  }
  const myNewCards = myHand.cards.filter((c) => c !== followCard && c !== myPending);

  await serviceClient
    .from("match_secrets")
    .update({ hand: { cards: myNewCards, pending: myPending } })
    .eq("match_id", match.id)
    .eq("seat", seat);
  if (theirNewHand !== theirHand) {
    await serviceClient
      .from("match_secrets")
      .update({ hand: theirNewHand })
      .eq("match_id", match.id)
      .eq("seat", theirs.seat);
  }

  const finished = newResolved.length >= TRICKS;
  const patch: Record<string, unknown> = {
    config: { ...config, resolved: newResolved, pending: newPending },
  };
  if (finished) {
    const wins = { 1: 0, 2: 0 };
    const margins = { 1: 0, 2: 0 };
    for (const t of newResolved) {
      if (t.winnerSeat === 1 || t.winnerSeat === 2) {
        wins[t.winnerSeat]++;
        margins[t.winnerSeat] += t.margin;
      }
    }
    patch.status = "finished";
    patch.winner_seat =
      wins[1] !== wins[2]
        ? wins[1] > wins[2]
          ? 1
          : 2
        : margins[1] !== margins[2]
          ? margins[1] > margins[2]
            ? 1
            : 2
          : null;
  }
  await serviceClient.from("matches").update(patch).eq("id", match.id);

  // score column mirrors trick wins for the public scoreboard
  for (const s of [1, 2] as const) {
    const score = newResolved.filter((t) => t.winnerSeat === s).length;
    await serviceClient
      .from("match_players")
      .update({ score })
      .eq("match_id", match.id)
      .eq("seat", s);
  }

  return { status: "accepted", state: await getMatchState(code, id) };
}

export async function forfeitMatch(code: string, id: Identity): Promise<string> {
  const { match } = await loadMatch(code);
  const { data, error } = await serviceClient.rpc("forfeit_match", {
    p_match: match.id,
    ...idParams(id),
  });
  if (error) throw new Error(error.message);
  return data as string;
}
