/**
 * Pool service (server-only): deals served assignments.
 *
 * Pair policy v1-uniform: uniform random distinct pairs over the postered
 * pool. Uniform sampling keeps the comparison graph connected in
 * expectation (Erdős–Rényi); informativeness-weighted near-neighbor
 * mixing is a planned v2 once Hotter's shadow data shows where variance
 * concentrates. The policy version is recorded on every assignment so
 * re-aggregation can distinguish sampling regimes.
 */
import { serviceClient } from "./service-client";
import type { CategoricalDimension, PairwiseDimension } from "../dimensions";

export const POLICY_VERSION = "v1-uniform";
export const RECOGNIZABLE_POLICY_VERSION = "v1-recognizable";

interface IdCache {
  ids: number[] | null;
  at: number;
}

const fullPool: IdCache = { ids: null, at: 0 };
const recognizablePool: IdCache = { ids: null, at: 0 };

async function fetchIds(cache: IdCache, applyFilter: (q: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>): Promise<number[]> {
  if (cache.ids && Date.now() - cache.at < 60 * 60 * 1000) return cache.ids;
  const ids: number[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await applyFilter(baseQuery()).range(from, from + 999);
    if (error) throw new Error(error.message);
    ids.push(...data.map((r: { tmdb_id: number }) => r.tmdb_id));
    if (data.length < 1000) break;
  }
  cache.ids = ids;
  cache.at = Date.now();
  return ids;
}

function baseQuery() {
  return serviceClient
    .from("movies")
    .select("tmdb_id")
    .not("poster_path", "is", null)
    .order("tmdb_id");
}

async function pooledIds(): Promise<number[]> {
  return fetchIds(fullPool, (q) => q);
}

/**
 * Movies a casual player has a real chance of knowing: both RT scores
 * present (a width-of-audience proxy — no popularity column exists) and a
 * decent rating. ~5.4K movies. Games that need recognition deal from here.
 */
async function recognizableIds(): Promise<number[]> {
  return fetchIds(recognizablePool, (q) =>
    q.not("rt_critic", "is", null).not("rt_audience", "is", null).gte("tmdb_rating", 6.5),
  );
}

export interface DealtPairMovie {
  /** Canonical assignment slot — submit_signal only accepts 'a' | 'b'. */
  key: "a" | "b";
  tmdb_id: number;
  title: string;
  year: number;
  poster_path: string | null;
  genres: string[];
  /** Model score on the dealt dimension (null if unscored). */
  score: number | null;
}

export interface DealtPair {
  assignmentId: string;
  /** movies in DISPLAY order (already shuffled server-side) */
  movies: DealtPairMovie[];
  dimension: PairwiseDimension;
}

export async function dealPair(opts: {
  dimension: PairwiseDimension;
  sessionId: string;
  userId: string | null;
  game: string;
  gameVersion: string;
  ipHash: string;
}): Promise<DealtPair> {
  const ids = await pooledIds();
  const a = ids[Math.floor(Math.random() * ids.length)];
  let b = a;
  while (b === a) b = ids[Math.floor(Math.random() * ids.length)];

  const displayedOrder = Math.random() < 0.5 ? "ab" : "ba";

  const { data: assignmentId, error } = await serviceClient.rpc("deal_assignment", {
    p_session_id: opts.sessionId,
    p_user_id: opts.userId,
    p_game: opts.game,
    p_game_version: opts.gameVersion,
    p_kind: "pairwise",
    p_dimension: opts.dimension,
    p_movie_a: a,
    p_movie_b: b,
    p_displayed_order: displayedOrder,
    p_prompt_version: "n/a",
    p_policy_version: POLICY_VERSION,
    p_ip_hash: opts.ipHash,
  });
  if (error) throw new Error(error.message);

  const { data: movies, error: mErr } = await serviceClient
    .from("movies")
    .select(`tmdb_id,title,year,poster_path,genres,${opts.dimension}`)
    .in("tmdb_id", [a, b]);
  if (mErr) throw new Error(mErr.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId = new Map((movies as any[]).map((m) => [m.tmdb_id, m]));
  const ordered = displayedOrder === "ab" ? [a, b] : [b, a];
  return {
    assignmentId: assignmentId as string,
    movies: ordered.map((id) => {
      const m = byId.get(id)!;
      return {
        key: (id === a ? "a" : "b") as "a" | "b",
        tmdb_id: m.tmdb_id,
        title: m.title,
        year: m.year,
        poster_path: m.poster_path,
        genres: m.genres,
        score: m[opts.dimension] ?? null,
      };
    }),
    dimension: opts.dimension,
  };
}

export interface DealtSingle {
  assignmentId: string;
  movie: {
    tmdb_id: number;
    title: string;
    year: number;
    poster_path: string | null;
    genres: string[];
    /** The model's current label on the dealt dimension (for the reveal). */
    modelLabel: string | null;
  };
  dimension: CategoricalDimension;
}

/** Column holding the model's label, per categorical dimension.
 * Recognition has no model label — the crowd IS the label. */
const CATEGORICAL_COLUMNS: Partial<Record<CategoricalDimension, string>> = {
  arc: "emotional_arc",
};

/**
 * Deals a single-movie categorical assignment from the recognizable pool
 * (the player must know the movie for the judgment to mean anything;
 * skips are emitted as choice='skip' and re-deal).
 */
export async function dealSingle(opts: {
  dimension: CategoricalDimension;
  sessionId: string;
  userId: string | null;
  game: string;
  gameVersion: string;
  promptVersion: string;
  ipHash: string;
}): Promise<DealtSingle> {
  // Recognition deals must sample beyond the likely-known pool or the
  // fame measurement only ever confirms itself: 70% recognizable, 30%
  // full pool. Label-backed dimensions stay on the recognizable pool.
  const useFullPool = opts.dimension === "recognition" && Math.random() < 0.3;
  const ids = useFullPool ? await pooledIds() : await recognizableIds();
  const id = ids[Math.floor(Math.random() * ids.length)];

  const { data: assignmentId, error } = await serviceClient.rpc("deal_assignment", {
    p_session_id: opts.sessionId,
    p_user_id: opts.userId,
    p_game: opts.game,
    p_game_version: opts.gameVersion,
    p_kind: "categorical",
    p_dimension: opts.dimension,
    p_movie_a: id,
    p_movie_b: null,
    p_displayed_order: null,
    p_prompt_version: opts.promptVersion,
    p_policy_version: RECOGNIZABLE_POLICY_VERSION,
    p_ip_hash: opts.ipHash,
  });
  if (error) throw new Error(error.message);

  const column = CATEGORICAL_COLUMNS[opts.dimension];
  const { data: movie, error: mErr } = await serviceClient
    .from("movies")
    .select(`tmdb_id,title,year,poster_path,genres${column ? `,${column}` : ""}`)
    .eq("tmdb_id", id)
    .single();
  if (mErr) throw new Error(mErr.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = movie as any;
  return {
    assignmentId: assignmentId as string,
    movie: {
      tmdb_id: m.tmdb_id,
      title: m.title,
      year: m.year,
      poster_path: m.poster_path,
      genres: m.genres,
      modelLabel: column ? (m[column] ?? null) : null,
    },
    dimension: opts.dimension,
  };
}

/** Deal several categorical singles concurrently (batch play surfaces). */
export async function dealSingles(
  count: number,
  opts: Parameters<typeof dealSingle>[0],
): Promise<DealtSingle[]> {
  const singles = await Promise.all(
    Array.from({ length: count }, () => dealSingle(opts)),
  );
  // de-dupe within the batch (uniform sampling can repeat)
  const seen = new Set<number>();
  return singles.filter((s) => {
    if (seen.has(s.movie.tmdb_id)) return false;
    seen.add(s.movie.tmdb_id);
    return true;
  });
}

export interface DeckMovie {
  tmdb_id: number;
  title: string;
  year: number;
  poster_path: string | null;
  /** Raw dimension values keyed by pairwise dimension name. */
  dims: Record<PairwiseDimension, number | null>;
}

/**
 * Deals a face-up deck from the recognizable pool (no assignment — the
 * card game is score-driven, not signal-collecting).
 */
export async function dealDeck(count: number, prefer: number[] = []): Promise<DeckMovie[]> {
  const ids = await recognizableIds();
  const picked = new Set<number>();
  // Seed the deck with movies the player has marked as known (Seen It),
  // capped so every draft still deals discovery.
  const preferCap = Math.min(prefer.length, Math.floor(count * 0.6));
  const shuffledPrefer = [...prefer].sort(() => Math.random() - 0.5);
  for (const id of shuffledPrefer) {
    if (picked.size >= preferCap) break;
    picked.add(id);
  }
  while (picked.size < Math.min(count, ids.length)) {
    picked.add(ids[Math.floor(Math.random() * ids.length)]);
  }
  const { data, error } = await serviceClient
    .from("movies")
    .select(
      "tmdb_id,title,year,poster_path,valence,arousal,dominance,absorption,hedonic,eudaimonic,psych_rich,comfort_level,conversation_potential",
    )
    .in("tmdb_id", [...picked]);
  if (error) throw new Error(error.message);

  return data.map((r) => ({
    tmdb_id: r.tmdb_id,
    title: r.title,
    year: r.year,
    poster_path: r.poster_path,
    dims: {
      valence: r.valence,
      arousal: r.arousal,
      dominance: r.dominance,
      absorption: r.absorption,
      hedonic: r.hedonic,
      eudaimonic: r.eudaimonic,
      psych_rich: r.psych_rich,
      comfort_level: r.comfort_level,
      conversation_potential: r.conversation_potential,
    },
  }));
}
