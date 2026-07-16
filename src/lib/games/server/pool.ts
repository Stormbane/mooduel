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

export const PAIRWISE_DIMENSIONS = [
  "valence", "arousal", "dominance", "absorption", "hedonic", "eudaimonic",
  "psych_rich", "comfort_level", "conversation_potential",
] as const;
export type PairwiseDimension = (typeof PAIRWISE_DIMENSIONS)[number];
export const POLICY_VERSION = "v1-uniform";

let idCache: number[] | null = null;
let idCacheAt = 0;

async function pooledIds(): Promise<number[]> {
  if (idCache && Date.now() - idCacheAt < 60 * 60 * 1000) return idCache;
  const ids: number[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await serviceClient
      .from("movies")
      .select("tmdb_id")
      .not("poster_path", "is", null)
      .order("tmdb_id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    ids.push(...data.map((r) => r.tmdb_id));
    if (data.length < 1000) break;
  }
  idCache = ids;
  idCacheAt = Date.now();
  return ids;
}

export interface DealtPair {
  assignmentId: string;
  /** movies in DISPLAY order (already shuffled server-side) */
  movies: { tmdb_id: number; title: string; year: number; poster_path: string | null; genres: string[] }[];
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
    .select("tmdb_id,title,year,poster_path,genres")
    .in("tmdb_id", [a, b]);
  if (mErr) throw new Error(mErr.message);

  const byId = new Map(movies.map((m) => [m.tmdb_id, m]));
  const ordered = displayedOrder === "ab" ? [a, b] : [b, a];
  return {
    assignmentId: assignmentId as string,
    movies: ordered.map((id) => byId.get(id)!),
    dimension: opts.dimension,
  };
}
