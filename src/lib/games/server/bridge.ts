/**
 * Mood Bridge server core: in-memory mood pool, deterministic daily
 * puzzle generation, and the hint rail. No assignments are dealt here —
 * the bridge is a showcase of the mood space, not a signal collector.
 */
import { serviceClient } from "./service-client";
import {
  moodDistance,
  hopBudget,
  puzzleNumber,
  BRIDGE_MAX_HOPS,
  BRIDGE_GAP_MIN,
  BRIDGE_GAP_MAX,
  type BridgeMovie,
  type BridgePuzzle,
} from "../mood-bridge";

interface PoolMovie extends BridgeMovie {
  recognizable: boolean;
}

let poolCache: PoolMovie[] | null = null;
let poolCacheAt = 0;

async function moodPool(): Promise<PoolMovie[]> {
  if (poolCache && Date.now() - poolCacheAt < 60 * 60 * 1000) return poolCache;
  const rows: PoolMovie[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await serviceClient
      .from("movies")
      .select(
        "tmdb_id,title,year,poster_path,valence,arousal,dominance,absorption,hedonic,eudaimonic,psych_rich,comfort_level,conversation_potential,rt_critic,rt_audience,tmdb_rating",
      )
      .not("poster_path", "is", null)
      .not("valence", "is", null)
      .order("tmdb_id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data) {
      rows.push({
        id: r.tmdb_id,
        t: r.title,
        y: r.year,
        pp: r.poster_path,
        va: r.valence,
        ar: r.arousal,
        do: r.dominance,
        ab: r.absorption,
        he: r.hedonic,
        eu: r.eudaimonic,
        pr: r.psych_rich,
        co: r.comfort_level,
        conv: r.conversation_potential,
        recognizable:
          r.rt_critic != null && r.rt_audience != null && (r.tmdb_rating ?? 0) >= 6.5,
      });
    }
    if (data.length < 1000) break;
  }
  poolCache = rows;
  poolCacheAt = Date.now();
  return rows;
}

/** mulberry32 — tiny deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashDate(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Greedy route: from `start`, repeatedly take the in-budget movie closest
 * to `target`. Returns hop count (including the final arrival) or null.
 */
function greedyHops(
  pool: PoolMovie[],
  start: BridgeMovie,
  target: BridgeMovie,
  budget: number,
): number | null {
  let pos: BridgeMovie = start;
  const visited = new Set<number>([start.id]);
  for (let hops = 0; hops < BRIDGE_MAX_HOPS; hops++) {
    if (moodDistance(pos, target) <= budget) return hops + 1;
    let best: PoolMovie | null = null;
    let bestD = moodDistance(pos, target);
    for (const m of pool) {
      if (visited.has(m.id) || m.id === target.id) continue;
      if (moodDistance(pos, m) > budget) continue;
      const dt = moodDistance(m, target);
      if (dt < bestD) {
        bestD = dt;
        best = m;
      }
    }
    if (!best) return null;
    visited.add(best.id);
    pos = best;
  }
  return null;
}

const strip = (m: PoolMovie): BridgeMovie => ({
  id: m.id, t: m.t, y: m.y, pp: m.pp,
  va: m.va, ar: m.ar, do: m.do, ab: m.ab, he: m.he,
  eu: m.eu, pr: m.pr, co: m.co, conv: m.conv,
});

const puzzleByDate = new Map<string, BridgePuzzle>();

/** Deterministic daily puzzle: same date → same bridge, on any instance. */
export async function dailyPuzzle(date: string): Promise<BridgePuzzle> {
  const cached = puzzleByDate.get(date);
  if (cached) return cached;

  const pool = await moodPool();
  const known = pool.filter((m) => m.recognizable);
  const seedBase = hashDate(date);

  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry32(seedBase + attempt);
    const start = known[Math.floor(rng() * known.length)];
    const target = known[Math.floor(rng() * known.length)];
    if (start.id === target.id) continue;
    const gap = moodDistance(start, target);
    if (gap < BRIDGE_GAP_MIN || gap > BRIDGE_GAP_MAX) continue;
    const budget = hopBudget(gap);
    const par = greedyHops(pool, start, target, budget);
    if (par === null) continue;

    const puzzle: BridgePuzzle = {
      date,
      number: puzzleNumber(date),
      start: strip(start),
      target: strip(target),
      budget,
      par,
    };
    puzzleByDate.set(date, puzzle);
    return puzzle;
  }
  throw new Error(`no solvable bridge found for ${date}`);
}

/**
 * Hint rail: movies within one hop of `fromId` under today's budget.
 * Shuffled, never sorted toward the target — direction stays the
 * player's problem.
 */
export async function nearMovies(date: string, fromId: number, limit = 12): Promise<BridgeMovie[]> {
  const [pool, puzzle] = await Promise.all([moodPool(), dailyPuzzle(date)]);
  const from =
    fromId === puzzle.start.id
      ? puzzle.start
      : fromId === puzzle.target.id
        ? puzzle.target
        : pool.find((m) => m.id === fromId);
  if (!from) throw new Error("unknown movie");

  const within = pool.filter(
    (m) => m.id !== fromId && moodDistance(m, from) <= puzzle.budget,
  );
  // Fisher–Yates on a copy, seeded per position for stable-ish variety
  const rng = mulberry32(hashDate(date) ^ fromId);
  for (let i = within.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [within[i], within[j]] = [within[j], within[i]];
  }
  return within.slice(0, limit).map(strip);
}
