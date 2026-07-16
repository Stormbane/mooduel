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

/** Column holding the model's label, per categorical dimension. */
const CATEGORICAL_COLUMNS: Record<CategoricalDimension, string> = {
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
  const ids = await recognizableIds();
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
    .select(`tmdb_id,title,year,poster_path,genres,${column}`)
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
      modelLabel: m[column] ?? null,
    },
    dimension: opts.dimension,
  };
}
