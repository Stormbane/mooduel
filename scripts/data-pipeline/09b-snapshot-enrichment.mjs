#!/usr/bin/env node
/**
 * 09b-snapshot-enrichment.mjs — persist the enrichment columns that never
 * lived in the canonical classifier JSONL (posters via 09-fetch-posters,
 * RT/IMDB scores joined during corpus build) into a committed artifact,
 * so seed-movies.ts can rebuild the movies table from the repo alone.
 *
 * Output: data/movie-enrichment.jsonl
 *   { tmdbId, posterPath, rtCritic, rtAudience, imdbRating }
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "../..");
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const out = fs.createWriteStream(path.join(ROOT, "data/movie-enrichment.jsonl"));
let from = 0, n = 0;
for (;;) {
  const { data, error } = await supabase
    .from("movies")
    .select("tmdb_id,poster_path,rt_critic,rt_audience,imdb_rating")
    .order("tmdb_id")
    .range(from, from + 999);
  if (error) { console.error(error.message); process.exit(1); }
  if (!data.length) break;
  for (const r of data) {
    out.write(JSON.stringify({ tmdbId: r.tmdb_id, posterPath: r.poster_path, rtCritic: r.rt_critic, rtAudience: r.rt_audience, imdbRating: r.imdb_rating }) + "\n");
    n++;
  }
  from += 1000;
}
await new Promise((res) => out.end(res));
console.log(`wrote ${n} enrichment rows to data/movie-enrichment.jsonl`);
