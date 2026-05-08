/**
 * Build static dashboard cache.
 *
 * Reads ALL movies from Supabase, computes the same payloads currently
 * served by /api/movies/scatter and /api/movies/stats, and writes them
 * to public/dashboard-cache/{scatter,stats}.json.
 *
 * The dashboard hooks fetch the static files first; the live API routes
 * remain as fallback for misses. Re-run this script whenever the movies
 * table changes (after a re-classification batch, after community
 * corrections accumulate, etc.).
 *
 * Run: npm run cache:dashboard
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or *_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllMovies(select: string): Promise<any[]> {
  const PAGE_SIZE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("movies")
      .select(select)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function toBar(obj: Record<string, number>) {
  const entries = Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const max = entries[0]?.[1] || 1;
  return entries.map(([label, value]) => ({
    label,
    value,
    pct: (value / max) * 100,
  }));
}

async function buildScatter() {
  const rows = await fetchAllMovies(
    "tmdb_id, title, year, valence, arousal, genres, tmdb_rating, vibe_sentence, pacing, ending_type",
  );
  const points = rows.map((row) => ({
    id: row.tmdb_id,
    t: row.title,
    y: row.year,
    va: row.valence,
    ar: row.arousal,
    g: row.genres,
    r: row.tmdb_rating,
    v: row.vibe_sentence,
    pa: row.pacing,
    end: row.ending_type,
  }));
  return points;
}

async function buildStats() {
  const allMovies = await fetchAllMovies(
    "valence, arousal, comfort_level, conversation_potential, absorption, emotional_arc, pacing, ending_type, genres, tmdb_id, title, year, vibe_sentence, tmdb_rating, poster_path",
  );
  const n = allMovies.length;
  if (n === 0) return { n: 0 };

  const avgV = allMovies.reduce((s, m) => s + m.valence, 0) / n;
  const avgA = allMovies.reduce((s, m) => s + m.arousal, 0) / n;
  const avgComfort = allMovies.reduce((s, m) => s + m.comfort_level, 0) / n;
  const avgConv =
    allMovies.reduce((s, m) => s + m.conversation_potential, 0) / n;

  const countField = (key: string) => {
    const counts: Record<string, number> = {};
    allMovies.forEach((m) => {
      const val = (m as Record<string, unknown>)[key] as string;
      counts[val] = (counts[val] || 0) + 1;
    });
    return toBar(counts);
  };

  const genreCounts: Record<string, number> = {};
  allMovies.forEach((m) =>
    (m.genres as string[]).forEach(
      (g) => (genreCounts[g] = (genreCounts[g] || 0) + 1),
    ),
  );

  let mostPleasant = allMovies[0];
  let mostUnpleasant = allMovies[0];
  let highestConvo = allMovies[0];
  let mostAbsorbing = allMovies[0];
  let comfyHorror: typeof allMovies[0] | null = null;
  let uncomfyComedy: typeof allMovies[0] | null = null;

  for (const m of allMovies) {
    if (m.valence > mostPleasant.valence) mostPleasant = m;
    if (m.valence < mostUnpleasant.valence) mostUnpleasant = m;
    if (m.conversation_potential > highestConvo.conversation_potential)
      highestConvo = m;
    if (m.absorption > mostAbsorbing.absorption) mostAbsorbing = m;
    if (
      (m.genres as string[]).includes("Horror") &&
      (!comfyHorror || m.comfort_level > comfyHorror.comfort_level)
    )
      comfyHorror = m;
    if (
      (m.genres as string[]).includes("Comedy") &&
      (!uncomfyComedy || m.comfort_level < uncomfyComedy.comfort_level)
    )
      uncomfyComedy = m;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toSuperlative = (m: any) => ({
    id: m.tmdb_id,
    t: m.title,
    y: m.year,
    v: m.vibe_sentence,
    va: m.valence,
    ar: m.arousal,
    co: m.comfort_level,
    conv: m.conversation_potential,
    ab: m.absorption,
    pp: m.poster_path,
    g: m.genres,
    r: m.tmdb_rating,
    end: m.ending_type,
    pa: m.pacing,
    arc: m.emotional_arc,
  });

  return {
    n,
    avgV,
    avgA,
    avgComfort,
    avgConv,
    arcs: countField("emotional_arc"),
    pacings: countField("pacing"),
    endings: countField("ending_type"),
    genres: toBar(genreCounts),
    mostPleasant: toSuperlative(mostPleasant),
    mostUnpleasant: toSuperlative(mostUnpleasant),
    highestConvo: toSuperlative(highestConvo),
    mostAbsorbing: toSuperlative(mostAbsorbing),
    comfyHorror: comfyHorror ? toSuperlative(comfyHorror) : null,
    uncomfyComedy: uncomfyComedy ? toSuperlative(uncomfyComedy) : null,
  };
}

async function main() {
  const outDir = join(process.cwd(), "public", "dashboard-cache");
  mkdirSync(outDir, { recursive: true });

  console.log("Building scatter cache...");
  const scatterStart = Date.now();
  const scatter = await buildScatter();
  writeFileSync(
    join(outDir, "scatter.json"),
    JSON.stringify(scatter),
  );
  console.log(
    `  scatter: ${scatter.length} points in ${Date.now() - scatterStart}ms`,
  );

  console.log("Building stats cache...");
  const statsStart = Date.now();
  const stats = await buildStats();
  writeFileSync(
    join(outDir, "stats.json"),
    JSON.stringify(stats),
  );
  console.log(`  stats: n=${stats.n} in ${Date.now() - statsStart}ms`);

  // Tag the cache with a build manifest so we can show "last refreshed" later
  writeFileSync(
    join(outDir, "manifest.json"),
    JSON.stringify({
      builtAt: new Date().toISOString(),
      scatterCount: scatter.length,
      movieCount: stats.n,
    }),
  );

  console.log("Done. Cache written to public/dashboard-cache/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
