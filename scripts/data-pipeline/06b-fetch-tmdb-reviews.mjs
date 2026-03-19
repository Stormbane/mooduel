/**
 * Step 6b: Fetch TMDB user reviews for movies missing RT reviews.
 *
 * Reads corpus, finds movies with no reviews, fetches from TMDB API,
 * writes back to corpus. Safe to re-run (skips movies that already have reviews).
 *
 * Usage: node scripts/data-pipeline/06b-fetch-tmdb-reviews.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const CORPUS_FILE = join(PROJECT_ROOT, "data", "movie-input-corpus.jsonl");
const RATE_LIMIT_MS = 55;

// Load env
const envFile = join(PROJECT_ROOT, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const match = line.match(/^(TMDB_READ_ACCESS_TOKEN)=(.+)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}
const TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
if (!TOKEN) { console.error("No TMDB_READ_ACCESS_TOKEN"); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchReviews(tmdbId) {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/reviews?language=en-US&page=1`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .filter((r) => r.content && r.content.length > 50)
      .slice(0, 3)
      .map((r) => ({
        source: "tmdb",
        author: r.author || "Anonymous",
        text: r.content.slice(0, 800),
        sentiment: r.author_details?.rating >= 7 ? "POSITIVE" : r.author_details?.rating <= 4 ? "NEGATIVE" : "NEUTRAL",
      }));
  } catch { return []; }
}

async function main() {
  console.log("=== Fetching TMDB Reviews for Missing Movies ===\n");

  const lines = readFileSync(CORPUS_FILE, "utf-8").split("\n").filter(Boolean);
  const corpus = lines.map((l) => JSON.parse(l));

  const needReviews = corpus.filter((m) => !m.reviews || m.reviews.length === 0);
  console.log(`Total corpus: ${corpus.length}`);
  console.log(`Already have reviews: ${corpus.length - needReviews.length}`);
  console.log(`Need TMDB reviews: ${needReviews.length}\n`);

  let fetched = 0;
  let empty = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < needReviews.length; i++) {
    const movie = needReviews[i];

    if (i % 200 === 0 && i > 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = i / elapsed;
      const eta = ((needReviews.length - i) / rate / 60).toFixed(1);
      console.log(`  ${i}/${needReviews.length} — ${fetched} found, ${empty} empty — ETA ${eta}min`);
    }

    try {
      const reviews = await fetchReviews(movie.tmdbId);
      if (reviews.length > 0) {
        movie.reviews = reviews;
        if (!movie.inputSources.includes("tmdb-reviews")) {
          movie.inputSources.push("tmdb-reviews");
        }
        fetched++;
      } else {
        movie.reviews = [];
        empty++;
      }
    } catch {
      movie.reviews = [];
      errors++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  const withReviews = corpus.filter((m) => m.reviews && m.reviews.length > 0).length;
  console.log(`\n=== Done ===`);
  console.log(`TMDB reviews found: ${fetched}`);
  console.log(`No reviews available: ${empty}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total with reviews: ${withReviews}/${corpus.length} (${(withReviews / corpus.length * 100).toFixed(1)}%)`);

  console.log("\nWriting updated corpus...");
  const output = corpus.map((m) => JSON.stringify(m)).join("\n") + "\n";
  writeFileSync(CORPUS_FILE, output, "utf-8");
  console.log("Done.");
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
