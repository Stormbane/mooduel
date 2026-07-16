/**
 * Mooduel: The Card Game — pure engine. No IO, no framework: the same
 * code drives solo play (client), the house bot, and the PvP legality
 * checks in service-role routes.
 *
 * Rules v1 ("mooduel-v1"):
 * - Snake draft from a face-up pool of 16 (A B B A ... — 8 cards each).
 * - 8 tricks. Leader announces a mood category and commits a card
 *   face-down; the follower commits face-down knowing only the category.
 *   Higher score in the category takes the trick; winner leads next.
 * - A category may be led only once per match (9 suits, 8 tricks).
 * - Most tricks wins; cumulative winning margin breaks ties.
 */
import { PAIRWISE_DIMENSIONS, type PairwiseDimension } from "./dimensions";
import { DIMENSION_COPY } from "./hotter";

export const RULES_VERSION = "mooduel-v1";
export const POOL_SIZE = 16;
export const HAND_SIZE = 8;
export const TRICKS = 8;

export type Category = PairwiseDimension;
export const CATEGORIES = PAIRWISE_DIMENSIONS;

/** Display name for a suit — the dimension nouns, capitalized. */
export function categoryLabel(c: Category): string {
  const noun = DIMENSION_COPY[c].noun;
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

/** A movie as a card: identity plus 0–100 scores in every category. */
export interface Card {
  id: number;
  t: string;
  y: number;
  pp: string | null;
  scores: Record<Category, number>;
}

/** Scale a raw dimension value to the 0–100 card stat. */
export function toCardScore(c: Category, raw: number | null): number {
  if (raw == null) return 50;
  const [lo, hi] = DIMENSION_COPY[c].scale;
  return Math.round(((raw - lo) / (hi - lo)) * 100);
}

export interface TrickRecord {
  category: Category;
  leader: "you" | "them";
  yourCard: Card;
  theirCard: Card;
  winner: "you" | "them" | "draw";
  margin: number;
}

export interface MatchScore {
  you: number;
  them: number;
  yourMargin: number;
  theirMargin: number;
}

export function scoreTrick(
  category: Category,
  leader: "you" | "them",
  yourCard: Card,
  theirCard: Card,
): TrickRecord {
  const a = yourCard.scores[category];
  const b = theirCard.scores[category];
  return {
    category,
    leader,
    yourCard,
    theirCard,
    winner: a === b ? "draw" : a > b ? "you" : "them",
    margin: Math.abs(a - b),
  };
}

export function tallyMatch(tricks: TrickRecord[]): MatchScore {
  const s: MatchScore = { you: 0, them: 0, yourMargin: 0, theirMargin: 0 };
  for (const t of tricks) {
    if (t.winner === "you") {
      s.you++;
      s.yourMargin += t.margin;
    } else if (t.winner === "them") {
      s.them++;
      s.theirMargin += t.margin;
    }
  }
  return s;
}

export function matchWinner(s: MatchScore): "you" | "them" | "draw" {
  if (s.you !== s.them) return s.you > s.them ? "you" : "them";
  if (s.yourMargin !== s.theirMargin) return s.yourMargin > s.theirMargin ? "you" : "them";
  return "draw";
}

/** Categories still available to lead. */
export function legalLeads(tricks: TrickRecord[]): Category[] {
  const led = new Set(tricks.map((t) => t.category));
  return CATEGORIES.filter((c) => !led.has(c));
}

/** Snake order for a 16-pick draft: A B B A A B B A ... */
export function draftOrder(): ("you" | "them")[] {
  const order: ("you" | "them")[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const round = Math.floor(i / 2);
    order.push(round % 2 === 0 ? (i % 2 === 0 ? "you" : "them") : i % 2 === 0 ? "them" : "you");
  }
  return order;
}

/** Your run's best card: most tricks won, then biggest total margin. */
export function mvpCard(tricks: TrickRecord[]): Card | null {
  const won = tricks.filter((t) => t.winner === "you");
  if (won.length === 0) return null;
  const byCard = new Map<number, { card: Card; wins: number; margin: number }>();
  for (const t of won) {
    const e = byCard.get(t.yourCard.id) ?? { card: t.yourCard, wins: 0, margin: 0 };
    e.wins++;
    e.margin += t.margin;
    byCard.set(t.yourCard.id, e);
  }
  return [...byCard.values()].sort((a, b) => b.wins - a.wins || b.margin - a.margin)[0].card;
}

/* ------------------------------ House bot ------------------------------- */
/**
 * The house bot sees both hands (the draft is face-up) but has no
 * lookahead and a taste for the occasional bad idea — beatable by anyone
 * who plans two tricks ahead.
 */

function best(cards: Card[], c: Category): Card {
  return cards.reduce((a, b) => (b.scores[c] > a.scores[c] ? b : a));
}

function worst(cards: Card[], c: Category): Card {
  return cards.reduce((a, b) => (b.scores[c] < a.scores[c] ? b : a));
}

/** Draft pick: strongest average with a small coverage bonus. */
export function botDraftPick(pool: Card[], botHand: Card[]): Card {
  let bestCard = pool[0];
  let bestVal = -Infinity;
  for (const card of pool) {
    const avg =
      CATEGORIES.reduce((s, c) => s + card.scores[c], 0) / CATEGORIES.length;
    // coverage: how much this card raises the bot's per-category maxima
    let coverage = 0;
    for (const c of CATEGORIES) {
      const have = botHand.length ? Math.max(...botHand.map((h) => h.scores[c])) : 0;
      coverage += Math.max(0, card.scores[c] - have);
    }
    const val = avg + coverage / CATEGORIES.length;
    if (val > bestVal) {
      bestVal = val;
      bestCard = card;
    }
  }
  return bestCard;
}

/**
 * Bot lead: among legal categories, pick where its best remaining card
 * clears the opponent's best by the widest margin (perfect information,
 * zero lookahead). 15% of the time it just shows off its favourite card.
 */
export function botLead(
  botCards: Card[],
  oppCards: Card[],
  legal: Category[],
  rand: () => number = Math.random,
): { category: Category; card: Card } {
  if (rand() < 0.15) {
    const card = botCards.reduce((a, b) =>
      Math.max(...CATEGORIES.map((c) => b.scores[c])) >
      Math.max(...CATEGORIES.map((c) => a.scores[c]))
        ? b
        : a,
    );
    const category = legal.reduce((a, b) => (card.scores[b] > card.scores[a] ? b : a));
    return { category, card };
  }
  let pick: { category: Category; card: Card } | null = null;
  let bestEdge = -Infinity;
  for (const c of legal) {
    const mine = best(botCards, c);
    const theirs = Math.max(...oppCards.map((o) => o.scores[c]));
    const edge = mine.scores[c] - theirs;
    if (edge > bestEdge) {
      bestEdge = edge;
      pick = { category: c, card: mine };
    }
  }
  return pick!;
}

/**
 * Bot follow: wins as cheaply as possible when it can beat the
 * opponent's best possible card; otherwise dumps its worst. 20% of the
 * time it forgets to be clever and just plays its best in category.
 */
export function botFollow(
  botCards: Card[],
  oppCards: Card[],
  category: Category,
  rand: () => number = Math.random,
): Card {
  if (rand() < 0.2) return best(botCards, category);
  const oppBest = Math.max(...oppCards.map((o) => o.scores[category]));
  const winners = botCards.filter((c) => c.scores[category] > oppBest);
  if (winners.length > 0) return worst(winners, category);
  return worst(botCards, category);
}

/** Deck payload shape shared by /api/games/deck and match configs. */
export interface DeckMovieShape {
  tmdb_id: number;
  title: string;
  year: number;
  poster_path: string | null;
  dims: Record<Category, number | null>;
}

export function deckToCard(m: DeckMovieShape): Card {
  const scores = {} as Record<Category, number>;
  for (const c of CATEGORIES) scores[c] = toCardScore(c, m.dims[c]);
  return { id: m.tmdb_id, t: m.title, y: m.year, pp: m.poster_path, scores };
}
