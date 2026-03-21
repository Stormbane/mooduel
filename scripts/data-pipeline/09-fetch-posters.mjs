/**
 * Fetch poster_path for all movies from TMDB API.
 * Writes poster paths directly into public/mood-data.json.
 *
 * Usage: node scripts/data-pipeline/09-fetch-posters.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_FILE = join(PROJECT_ROOT, "public", "mood-data.json");
const RATE_LIMIT_MS = 55;

const envFile = join(PROJECT_ROOT, ".env.local");
let TOKEN = "";
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const m = line.match(/^TMDB_READ_ACCESS_TOKEN=(.+)$/);
    if (m) TOKEN = m[1].trim();
  }
}
if (!TOKEN) { console.error("No TMDB_READ_ACCESS_TOKEN"); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPosterPath(tmdbId) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=en-US`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.poster_path || null;
  } catch { return null; }
}

async function main() {
  console.log("=== Fetching Poster Paths ===\n");

  const movies = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  const needPosters = movies.filter((m) => !m.pp);
  console.log(`Total: ${movies.length}`);
  console.log(`Already have poster: ${movies.length - needPosters.length}`);
  console.log(`Need poster: ${needPosters.length}\n`);

  let found = 0, empty = 0;
  const startTime = Date.now();

  for (let i = 0; i < needPosters.length; i++) {
    const movie = needPosters[i];

    if (i % 500 === 0 && i > 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = i / elapsed;
      const eta = ((needPosters.length - i) / rate / 60).toFixed(1);
      console.log(`  ${i}/${needPosters.length} — ${found} found — ETA ${eta}min`);

      // Save progress every 500
      writeFileSync(DATA_FILE, JSON.stringify(movies));
    }

    const posterPath = await fetchPosterPath(movie.id);
    if (posterPath) {
      movie.pp = posterPath;
      found++;
    } else {
      empty++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n=== Done ===`);
  console.log(`Found: ${found}`);
  console.log(`No poster: ${empty}`);

  writeFileSync(DATA_FILE, JSON.stringify(movies));
  console.log(`Saved to ${DATA_FILE}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
