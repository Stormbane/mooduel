/**
 * Step 6: Add critic reviews to the movie corpus.
 *
 * Strategy:
 * 1. Load corpus and build title+year lookup
 * 2. Match RT movies to corpus, build rt_id → tmdbId map
 * 3. Stream RT reviews, keeping only top 3 per matched movie
 * 4. For movies without RT reviews, fetch TMDB user reviews
 * 5. Write updated corpus
 *
 * Usage: node scripts/data-pipeline/06-add-reviews.mjs [--skip-tmdb]
 */

import { createReadStream, readFileSync, writeFileSync, existsSync } from "fs";
import { createInterface } from "readline";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const RT_MOVIES_FILE = join(PROJECT_ROOT, "data", "raw", "rt", "rotten_tomatoes_movies.csv");
const RT_REVIEWS_FILE = join(PROJECT_ROOT, "data", "raw", "rt", "rotten_tomatoes_movie_reviews.csv");
const CORPUS_FILE = join(PROJECT_ROOT, "data", "movie-input-corpus.jsonl");

const SKIP_TMDB = process.argv.includes("--skip-tmdb");
const TMDB_RATE_LIMIT_MS = 55; // ~18 req/sec, safely under TMDB's 20/sec limit

// Load env for TMDB API
const envFile = join(PROJECT_ROOT, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const match = line.match(/^(TMDB_READ_ACCESS_TOKEN)=(.+)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}
const TMDB_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;

// ── CSV Parser ──
function parseCSV(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) { fields.push(current); current = ""; }
    else current += ch;
  }
  fields.push(current);
  return fields;
}

function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/&/g, "and")
    .replace(/[^a-z0-9' ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function* readCSV(filePath) {
  const rl = createInterface({
    input: createReadStream(filePath, "utf-8"),
    crlfDelay: Infinity,
  });
  let header = null;
  for await (const line of rl) {
    if (!header) { header = parseCSV(line); continue; }
    const fields = parseCSV(line);
    const obj = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = fields[i] || "";
    yield obj;
  }
}

async function fetchTmdbReviews(tmdbId) {
  if (!TMDB_TOKEN) return [];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/reviews?language=en-US&page=1`,
      { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, "Content-Type": "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .filter((r) => r.content && r.content.length > 50)
      .slice(0, 5)
      .map((r) => ({
        source: "tmdb",
        author: r.author || "Anonymous",
        text: r.content.slice(0, 800),
        sentiment: r.author_details?.rating >= 7 ? "POSITIVE" : r.author_details?.rating <= 4 ? "NEGATIVE" : "NEUTRAL",
      }));
  } catch { return []; }
}

function scoreReview(r) {
  return (r.isTopCritic === "True" ? 10 : 0)
    + (r.reviewText.length > 200 ? 5 : 0)
    + (r.reviewText.length > 400 ? 3 : 0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("=== Adding Reviews to Corpus ===\n");

  // Step 1: Load corpus into memory (small — ~30K records, just need title/year/tmdbId)
  console.log("Loading corpus...");
  const corpusLines = readFileSync(CORPUS_FILE, "utf-8").split("\n").filter(Boolean);
  const corpus = corpusLines.map((l) => JSON.parse(l));
  console.log(`  ${corpus.length} movies`);

  // Build title+year → corpus index lookup
  const titleYearToCorpus = new Map();
  for (let i = 0; i < corpus.length; i++) {
    const m = corpus[i];
    const key = `${normalizeTitle(m.title)}|${m.year}`;
    if (!titleYearToCorpus.has(key)) titleYearToCorpus.set(key, i);
    // Also index by originalTitle
    if (m.originalTitle && m.originalTitle !== m.title) {
      const key2 = `${normalizeTitle(m.originalTitle)}|${m.year}`;
      if (!titleYearToCorpus.has(key2)) titleYearToCorpus.set(key2, i);
    }
  }

  // Step 2: Match RT movies → corpus, build rt_id → corpusIndex + collect RT scores
  console.log("Matching RT movies to corpus...");
  const rtIdToCorpusIdx = new Map(); // rt_id → corpus index
  const rtScores = new Map(); // corpus index → { tomatoMeter, audienceScore }
  let rtMovieCount = 0;

  for await (const row of readCSV(RT_MOVIES_FILE)) {
    rtMovieCount++;
    const date = row.releaseDateTheaters || row.releaseDateStreaming || "";
    const year = date.slice(0, 4);
    const yearNum = year && !isNaN(year) ? parseInt(year) : null;

    // Try exact title+year match
    let corpusIdx = null;
    if (yearNum) {
      corpusIdx = titleYearToCorpus.get(`${normalizeTitle(row.title)}|${yearNum}`);
      // Try year±1 if no exact match
      if (corpusIdx === undefined) corpusIdx = titleYearToCorpus.get(`${normalizeTitle(row.title)}|${yearNum - 1}`);
      if (corpusIdx === undefined) corpusIdx = titleYearToCorpus.get(`${normalizeTitle(row.title)}|${yearNum + 1}`);
    }

    if (corpusIdx !== undefined && corpusIdx !== null) {
      rtIdToCorpusIdx.set(row.id, corpusIdx);
      const tm = row.tomatoMeter ? parseInt(row.tomatoMeter) : null;
      const as = row.audienceScore ? parseInt(row.audienceScore) : null;
      if (tm !== null || as !== null) {
        rtScores.set(corpusIdx, { tomatoMeter: tm, audienceScore: as });
      }
    }
  }
  console.log(`  ${rtMovieCount} RT movies scanned, ${rtIdToCorpusIdx.size} matched to corpus`);

  // Step 3: Stream reviews, only keep those for matched movies
  // Keep top 5 per movie in a small buffer, then pick best 3 at the end
  console.log("Streaming RT reviews (keeping matched only)...");
  const reviewBuffers = new Map(); // corpusIdx → review[] (max 20, scored)

  let totalReviews = 0;
  let keptReviews = 0;

  for await (const row of readCSV(RT_REVIEWS_FILE)) {
    totalReviews++;
    if (totalReviews % 200000 === 0) process.stdout.write(`  ${(totalReviews / 1000).toFixed(0)}K streamed\r`);

    if (!row.reviewText || row.reviewText.length < 30) continue;

    const corpusIdx = rtIdToCorpusIdx.get(row.id);
    if (corpusIdx === undefined) continue;

    if (!reviewBuffers.has(corpusIdx)) reviewBuffers.set(corpusIdx, []);
    const buf = reviewBuffers.get(corpusIdx);

    const score = scoreReview(row);

    // Keep buffer at max 20, evict lowest score
    if (buf.length < 20) {
      buf.push({ ...row, _score: score });
      keptReviews++;
    } else {
      const minIdx = buf.reduce((mi, r, i) => r._score < buf[mi]._score ? i : mi, 0);
      if (score > buf[minIdx]._score) {
        buf[minIdx] = { ...row, _score: score };
        keptReviews++;
      }
    }
  }
  console.log(`\n  ${totalReviews} reviews streamed, ${keptReviews} kept for ${reviewBuffers.size} movies`);

  // Step 4: Select best 3 per movie and attach to corpus
  console.log("\nSelecting best reviews per movie...");
  let rtAttached = 0;

  for (const [corpusIdx, buf] of reviewBuffers) {
    const selected = selectBest3(buf);
    corpus[corpusIdx].reviews = selected.map((r) => ({
      source: "rt",
      author: r.criticName || "Unknown",
      isTopCritic: r.isTopCritic === "True",
      text: r.reviewText.slice(0, 800),
      sentiment: r.scoreSentiment || "NEUTRAL",
    }));
    if (!corpus[corpusIdx].inputSources.includes("rt")) {
      corpus[corpusIdx].inputSources.push("rt");
    }
    rtAttached++;
  }

  // Attach RT scores
  for (const [corpusIdx, scores] of rtScores) {
    if (scores.tomatoMeter !== null) corpus[corpusIdx].rtCriticScore = scores.tomatoMeter;
    if (scores.audienceScore !== null) corpus[corpusIdx].rtAudienceScore = scores.audienceScore;
  }
  console.log(`  RT reviews attached to ${rtAttached} movies`);
  console.log(`  RT scores attached to ${rtScores.size} movies`);

  // Step 5: Fetch TMDB reviews for movies without RT data
  if (!SKIP_TMDB && TMDB_TOKEN) {
    const needTmdb = corpus.filter((m) => !m.reviews || m.reviews.length === 0);
    console.log(`\nFetching TMDB reviews for ${needTmdb.length} movies without RT data...`);

    let tmdbFetched = 0;
    let tmdbEmpty = 0;

    for (let i = 0; i < needTmdb.length; i++) {
      const movie = needTmdb[i];
      if (i % 100 === 0) process.stdout.write(`  ${i}/${needTmdb.length} (${tmdbFetched} found)\r`);

      const reviews = await fetchTmdbReviews(movie.tmdbId);
      if (reviews.length > 0) {
        movie.reviews = reviews;
        if (!movie.inputSources.includes("tmdb-reviews")) {
          movie.inputSources.push("tmdb-reviews");
        }
        tmdbFetched++;
      } else {
        movie.reviews = [];
        tmdbEmpty++;
      }

      await sleep(TMDB_RATE_LIMIT_MS);
    }
    console.log(`\n  TMDB reviews found for ${tmdbFetched} movies, ${tmdbEmpty} with no reviews`);
  } else {
    // Ensure all movies have a reviews array
    for (const m of corpus) {
      if (!m.reviews) m.reviews = [];
    }
    if (SKIP_TMDB) console.log("\nSkipping TMDB review fetch (--skip-tmdb)");
  }

  // Stats
  const withReviews = corpus.filter((m) => m.reviews && m.reviews.length > 0).length;
  const withRt = corpus.filter((m) => m.inputSources.includes("rt")).length;
  const withTmdbR = corpus.filter((m) => m.inputSources.includes("tmdb-reviews")).length;
  const withScores = corpus.filter((m) => m.rtCriticScore !== undefined).length;

  console.log(`\n=== Final Stats ===`);
  console.log(`Total corpus:        ${corpus.length}`);
  console.log(`With reviews:        ${withReviews} (${(withReviews / corpus.length * 100).toFixed(1)}%)`);
  console.log(`  RT reviews:        ${withRt}`);
  console.log(`  TMDB reviews:      ${withTmdbR}`);
  console.log(`  No reviews:        ${corpus.length - withReviews}`);
  console.log(`With RT scores:      ${withScores}`);

  // Write
  console.log("\nWriting updated corpus...");
  const output = corpus.map((m) => JSON.stringify(m)).join("\n") + "\n";
  writeFileSync(CORPUS_FILE, output, "utf-8");
  console.log("Done.");
}

function selectBest3(reviews) {
  reviews.sort((a, b) => b._score - a._score);
  const positive = reviews.filter((r) => r.scoreSentiment === "POSITIVE");
  const negative = reviews.filter((r) => r.scoreSentiment === "NEGATIVE");

  const selected = [];
  if (positive.length > 0) selected.push(positive[0]);
  if (negative.length > 0) selected.push(negative[0]);
  for (const r of reviews) {
    if (selected.length >= 3) break;
    if (!selected.includes(r)) selected.push(r);
  }
  return selected.slice(0, 3);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
