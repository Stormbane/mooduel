/**
 * Dinner Party server core: seats guests, samples shelves from the
 * recognizable pool, and gates party quality so the decision matters —
 * one film that threads the table, real traps, daylight between them.
 */
import { serviceClient } from "./service-client";
import {
  GUESTS,
  guestReaction,
  guestSatisfaction,
  GUESTS_PER_PARTY,
  SHELF_SIZE,
  type Guest,
  type PartyMovieProfile,
} from "../dinner-party";

interface PoolMovie extends PartyMovieProfile {
  id: number;
  t: string;
  y: number;
  pp: string | null;
  v: string;
}

let poolCache: PoolMovie[] | null = null;
let poolCacheAt = 0;

async function partyPool(): Promise<PoolMovie[]> {
  if (poolCache && Date.now() - poolCacheAt < 60 * 60 * 1000) return poolCache;
  const rows: PoolMovie[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await serviceClient
      .from("movies")
      .select(
        "tmdb_id,title,year,poster_path,vibe_sentence,valence,arousal,hedonic,absorption,comfort_level,conversation_potential,eudaimonic,genres,mood_tags,safety_warnings",
      )
      .not("poster_path", "is", null)
      .not("valence", "is", null)
      .not("rt_critic", "is", null)
      .not("rt_audience", "is", null)
      .gte("tmdb_rating", 6.5)
      .order("tmdb_id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data) {
      rows.push({
        id: r.tmdb_id,
        t: r.title,
        y: r.year,
        pp: r.poster_path,
        v: r.vibe_sentence,
        va: r.valence,
        ar: r.arousal,
        he: r.hedonic,
        ab: r.absorption,
        co: r.comfort_level,
        conv: r.conversation_potential,
        eu: r.eudaimonic,
        genres: r.genres ?? [],
        tags: r.mood_tags ?? [],
        warnings: r.safety_warnings ?? [],
      });
    }
    if (data.length < 1000) break;
  }
  poolCache = rows;
  poolCacheAt = Date.now();
  return rows;
}

export interface ServedShelfMovie {
  id: number;
  t: string;
  y: number;
  pp: string | null;
  v: string;
  /** One reaction per seated guest, in guest order. */
  reactions: { s: number; line: string }[];
  total: number;
}

export interface ServedParty {
  guests: { name: string; vignette: string }[];
  shelf: ServedShelfMovie[];
  modelPickId: number;
}

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function buildParty(pool: PoolMovie[], guests: Guest[]): ServedParty | null {
  // gates relax with attempts so a party always arrives
  for (let attempt = 0; attempt < 60; attempt++) {
    const relax = Math.floor(attempt / 15) * 0.15;
    const bestFloor = 3.0 - relax;
    const gapFloor = 0.3 - relax * 0.4;
    const trapCeil = 2.1 + relax;

    const shelf = sample(pool, SHELF_SIZE);
    const totals = shelf.map((m) =>
      guests.reduce((acc, g) => acc + guestSatisfaction(g, m), 0),
    );
    const order = totals.map((t, i) => ({ t, i })).sort((a, b) => b.t - a.t);
    const best = order[0];
    const second = order[1];
    const worst = order[order.length - 1];

    if (best.t < bestFloor) continue;
    if (best.t - second.t < gapFloor) continue;
    if (worst.t > trapCeil) continue;

    return {
      guests: guests.map((g) => ({ name: g.name, vignette: g.vignette })),
      shelf: shelf.map((m, mi) => ({
        id: m.id,
        t: m.t,
        y: m.y,
        pp: m.pp,
        v: m.v,
        reactions: guests.map((g, gi) => guestReaction(g, m, m.id + gi + mi)),
        total: totals[mi],
      })),
      modelPickId: shelf[best.i].id,
    };
  }
  return null;
}

/** Serve `count` parties with disjoint guest lists. */
export async function serveParties(count: number): Promise<ServedParty[]> {
  const pool = await partyPool();
  const seated = sample(GUESTS, count * GUESTS_PER_PARTY);
  const parties: ServedParty[] = [];
  for (let p = 0; p < count; p++) {
    const guests = seated.slice(p * GUESTS_PER_PARTY, (p + 1) * GUESTS_PER_PARTY);
    const party = buildParty(pool, guests);
    if (!party) throw new Error("no viable party found");
    parties.push(party);
  }
  return parties;
}
