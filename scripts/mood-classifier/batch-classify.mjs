/**
 * Batch classify movies using the Anthropic Message Batches API.
 *
 * Reads movie-input-corpus.jsonl, builds batch requests, submits them,
 * polls for completion, and writes results to data/movie-mood-scores.jsonl.
 *
 * Usage:
 *   node scripts/mood-classifier/batch-classify.mjs [--limit N] [--resume]
 *
 * Options:
 *   --limit N   Only classify the first N movies (for testing)
 *   --resume    Skip movies that already have scores in the output file
 *
 * Requires: ANTHROPIC_API_KEY env var (or in .env.local)
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, appendFileSync, createReadStream } from "fs";
import { createInterface } from "readline";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const CORPUS_FILE = join(PROJECT_ROOT, "data", "movie-input-corpus.jsonl");
const OUTPUT_FILE = join(PROJECT_ROOT, "data", "movie-mood-scores.jsonl");
const BATCH_LOG_FILE = join(PROJECT_ROOT, "data", "batch-log.jsonl");
const SYSTEM_PROMPT_FILE = join(__dirname, "prompt.txt");
const SCHEMA_FILE = join(__dirname, "schema.json");

const MAX_REQUESTS_PER_BATCH = 10_000;
const POLL_INTERVAL_MS = 30_000; // 30 seconds
const MODEL = "claude-haiku-4-5-20251001";

// ── Load env ──
function loadEnv() {
  const envFile = join(PROJECT_ROOT, ".env.local");
  if (!process.env.ANTHROPIC_API_KEY && existsSync(envFile)) {
    const lines = readFileSync(envFile, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
      if (match) process.env.ANTHROPIC_API_KEY = match[1].trim();
    }
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY not set");
    process.exit(1);
  }
}

// ── Build user prompt for a movie ──
function buildUserPrompt(movie) {
  const parts = [`Classify the mood dimensions of this movie.\n`];
  parts.push(`TITLE: ${movie.title}`);
  if (movie.originalTitle && movie.originalTitle !== movie.title) {
    parts.push(`ORIGINAL TITLE: ${movie.originalTitle}`);
  }
  if (movie.year) parts.push(`YEAR: ${movie.year}`);
  if (movie.genres?.length) parts.push(`GENRES: ${movie.genres.join(", ")}`);
  if (movie.runtime) parts.push(`RUNTIME: ${movie.runtime}min`);
  if (movie.originalLanguage) parts.push(`LANGUAGE: ${movie.originalLanguage}`);
  if (movie.tagline) parts.push(`TAGLINE: ${movie.tagline}`);
  if (movie.keywords?.length) parts.push(`KEYWORDS: ${movie.keywords.join(", ")}`);

  if (movie.overview) {
    parts.push(`\nTMDB OVERVIEW:\n${movie.overview}`);
  }

  if (movie.wikipediaPlot) {
    // Truncate to ~4000 chars to keep token usage reasonable
    const plot = movie.wikipediaPlot.slice(0, 4000);
    parts.push(`\nWIKIPEDIA PLOT SUMMARY:\n${plot}`);
  }

  parts.push(`\nScore this movie on all dimensions. Use the full range of each scale.`);
  return parts.join("\n");
}

// ── Read corpus as async iterator ──
async function* readCorpus(limit) {
  const rl = createInterface({
    input: createReadStream(CORPUS_FILE, "utf-8"),
    crlfDelay: Infinity,
  });
  let count = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    yield JSON.parse(line);
    count++;
    if (limit && count >= limit) break;
  }
}

// ── Load already-classified TMDB IDs ──
function loadExistingIds() {
  const ids = new Set();
  if (!existsSync(OUTPUT_FILE)) return ids;
  const lines = readFileSync(OUTPUT_FILE, "utf-8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.tmdbId) ids.add(obj.tmdbId);
    } catch { /* skip malformed lines */ }
  }
  return ids;
}

// ── Sleep helper ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main ──
async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 0;
  const resume = args.includes("--resume");

  loadEnv();
  const client = new Anthropic();

  const systemPrompt = readFileSync(SYSTEM_PROMPT_FILE, "utf-8");
  const schema = JSON.parse(readFileSync(SCHEMA_FILE, "utf-8"));

  console.log("=== Movie Mood Batch Classification ===\n");
  console.log(`Model: ${MODEL}`);
  console.log(`Corpus: ${CORPUS_FILE}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  if (limit) console.log(`Limit: ${limit} movies`);
  if (resume) console.log("Resume mode: skipping already-classified movies");
  console.log();

  // Load existing IDs if resuming
  const existingIds = resume ? loadExistingIds() : new Set();
  if (resume) console.log(`Found ${existingIds.size} already-classified movies\n`);

  // Collect movies into batches
  const allMovies = [];
  for await (const movie of readCorpus(limit)) {
    if (resume && existingIds.has(movie.tmdbId)) continue;
    allMovies.push(movie);
  }
  console.log(`Movies to classify: ${allMovies.length}\n`);

  if (allMovies.length === 0) {
    console.log("Nothing to classify. Done.");
    return;
  }

  // Split into batches of MAX_REQUESTS_PER_BATCH
  const batches = [];
  for (let i = 0; i < allMovies.length; i += MAX_REQUESTS_PER_BATCH) {
    batches.push(allMovies.slice(i, i + MAX_REQUESTS_PER_BATCH));
  }
  console.log(`Submitting ${batches.length} batch(es)...\n`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batchMovies = batches[batchIdx];
    console.log(`── Batch ${batchIdx + 1}/${batches.length} (${batchMovies.length} movies) ──`);

    // Build batch requests
    const requests = batchMovies.map((movie) => ({
      custom_id: `tmdb-${movie.tmdbId}`,
      params: {
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: buildUserPrompt(movie) }],
      },
    }));

    // Submit batch
    const batch = await client.messages.batches.create({ requests });
    console.log(`Batch submitted: ${batch.id}`);
    console.log(`Status: ${batch.processing_status}`);

    // Log batch info
    const logEntry = {
      batchId: batch.id,
      submittedAt: new Date().toISOString(),
      movieCount: batchMovies.length,
      firstTmdbId: batchMovies[0].tmdbId,
      lastTmdbId: batchMovies[batchMovies.length - 1].tmdbId,
    };
    appendFileSync(BATCH_LOG_FILE, JSON.stringify(logEntry) + "\n");

    // Poll for completion
    let status = batch.processing_status;
    while (status !== "ended") {
      console.log(`  Waiting ${POLL_INTERVAL_MS / 1000}s... (status: ${status})`);
      await sleep(POLL_INTERVAL_MS);
      const updated = await client.messages.batches.retrieve(batch.id);
      status = updated.processing_status;

      // Show progress
      const counts = updated.request_counts;
      const done = counts.succeeded + counts.errored + counts.expired + counts.canceled;
      const total = done + counts.processing;
      console.log(
        `  Progress: ${done}/${total} (${counts.succeeded} ok, ${counts.errored} err)`
      );
    }

    console.log(`Batch ${batch.id} complete. Downloading results...`);

    // Download results
    const movieLookup = new Map(batchMovies.map((m) => [`tmdb-${m.tmdbId}`, m]));
    let succeeded = 0;
    let failed = 0;

    for await (const result of client.messages.batches.results(batch.id)) {
      const movie = movieLookup.get(result.custom_id);
      if (!movie) {
        console.error(`  Unknown custom_id: ${result.custom_id}`);
        failed++;
        continue;
      }

      if (result.result.type !== "succeeded") {
        console.error(
          `  FAILED ${movie.title} (${movie.tmdbId}): ${result.result.type}`
        );
        failed++;
        continue;
      }

      // Extract the JSON content from the response
      const message = result.result.message;
      const jsonBlock = message.content.find((c) => c.type === "text");
      if (!jsonBlock) {
        console.error(`  No text content for ${movie.title} (${movie.tmdbId})`);
        failed++;
        continue;
      }

      let moodScore;
      try {
        moodScore = JSON.parse(jsonBlock.text);
      } catch (e) {
        console.error(`  Invalid JSON for ${movie.title} (${movie.tmdbId}): ${e.message}`);
        failed++;
        continue;
      }

      // Build output record
      const record = {
        tmdbId: movie.tmdbId,
        imdbId: movie.imdbId || null,
        wikidataId: movie.wikidataId || null,
        title: movie.title,
        originalTitle: movie.originalTitle || movie.title,
        year: movie.year,
        tmdbUrl: movie.tmdbUrl,
        imdbUrl: movie.imdbUrl || null,
        wikipediaUrl: movie.wikipediaUrl || null,
        genres: movie.genres || [],
        originalLanguage: movie.originalLanguage || "",
        releaseDate: movie.releaseDate || "",
        runtime: movie.runtime || null,
        tmdbPopularity: movie.popularity || 0,
        tmdbVoteCount: movie.voteCount || 0,
        tmdbRating: movie.voteAverage || null,
        inputSources: movie.inputSources || ["tmdb"],
        classifierModel: MODEL,
        classifiedAt: new Date().toISOString(),
        classifierVersion: "1.0.0",
        ...moodScore,
      };

      appendFileSync(OUTPUT_FILE, JSON.stringify(record) + "\n");
      succeeded++;
    }

    console.log(`  Results: ${succeeded} succeeded, ${failed} failed\n`);
  }

  // Final stats
  const totalScores = loadExistingIds().size;
  console.log("=== DONE ===");
  console.log(`Total scores in ${OUTPUT_FILE}: ${totalScores}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
