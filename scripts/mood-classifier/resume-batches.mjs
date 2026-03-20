/**
 * Resume batch classification — polls existing batches, downloads results,
 * then submits remaining movies.
 *
 * Usage: node scripts/mood-classifier/resume-batches.mjs
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
const BATCH_LOG = join(PROJECT_ROOT, "data", "batch-log.jsonl");
const SYSTEM_PROMPT = readFileSync(join(__dirname, "prompt.txt"), "utf-8");
const SCHEMA = JSON.parse(readFileSync(join(__dirname, "schema.json"), "utf-8"));

const MODEL = "claude-haiku-4-5-20251001";
const MAX_PER_BATCH = 10_000;
const POLL_MS = 30_000;

// Load env
const envFile = join(PROJECT_ROOT, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const m = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
    if (m) process.env.ANTHROPIC_API_KEY = m[1].trim();
  }
}

const client = new Anthropic();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildUserPrompt(movie) {
  const parts = [`Classify the mood dimensions of this movie.\n`];
  parts.push(`TITLE: ${movie.title}`);
  if (movie.originalTitle && movie.originalTitle !== movie.title) parts.push(`ORIGINAL TITLE: ${movie.originalTitle}`);
  if (movie.year) parts.push(`YEAR: ${movie.year}`);
  if (movie.genres?.length) parts.push(`GENRES: ${movie.genres.join(", ")}`);
  if (movie.runtime) parts.push(`RUNTIME: ${movie.runtime}min`);
  if (movie.originalLanguage) parts.push(`LANGUAGE: ${movie.originalLanguage}`);
  if (movie.tagline) parts.push(`TAGLINE: ${movie.tagline}`);
  if (movie.keywords?.length) parts.push(`KEYWORDS: ${movie.keywords.join(", ")}`);
  if (movie.certification) parts.push(`CERTIFICATION: ${movie.certification} (${movie.certCountry || "US"})`);
  if (movie.overview) parts.push(`\nTMDB OVERVIEW:\n${movie.overview}`);
  if (movie.wikipediaPlot) parts.push(`\nWIKIPEDIA PLOT SUMMARY:\n${movie.wikipediaPlot.slice(0, 4000)}`);
  if (movie.reviews?.length > 0) {
    const revs = movie.reviews.slice(0, 3).map((r) => {
      const label = r.source === "rt" ? `[RT${r.isTopCritic ? " Top Critic" : ""}]` : "[TMDB User]";
      return `${label} (${r.sentiment || ""}) ${r.text.slice(0, 500)}`;
    });
    parts.push(`\nCRITIC/USER REVIEWS:\n${revs.join("\n\n")}`);
  }
  if (movie.movieLensTags && Object.keys(movie.movieLensTags).length > 0) {
    const tags = Object.entries(movie.movieLensTags).slice(0, 10).map(([t, r]) => `${t} (${r})`).join(", ");
    parts.push(`\nMOVIELENS TAGS: ${tags}`);
  }
  parts.push(`\nScore this movie on all dimensions. Use the full range of each scale.`);
  return parts.join("\n");
}

function loadExistingIds() {
  const ids = new Set();
  if (!existsSync(OUTPUT_FILE)) return ids;
  for (const line of readFileSync(OUTPUT_FILE, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try { ids.add(JSON.parse(line).tmdbId); } catch {}
  }
  return ids;
}

async function downloadBatchResults(batchId, movieLookup) {
  let succeeded = 0, failed = 0;
  for await (const result of client.messages.batches.results(batchId)) {
    const movie = movieLookup.get(result.custom_id);
    if (!movie) { failed++; continue; }
    if (result.result.type !== "succeeded") { failed++; continue; }
    const jsonBlock = result.result.message.content.find((c) => c.type === "text");
    if (!jsonBlock) { failed++; continue; }
    let moodScore;
    try { moodScore = JSON.parse(jsonBlock.text); } catch { failed++; continue; }

    const record = {
      tmdbId: movie.tmdbId, imdbId: movie.imdbId || null,
      wikidataId: movie.wikidataId || null, title: movie.title,
      originalTitle: movie.originalTitle || movie.title, year: movie.year,
      tmdbUrl: movie.tmdbUrl, imdbUrl: movie.imdbUrl || null,
      wikipediaUrl: movie.wikipediaUrl || null, genres: movie.genres || [],
      originalLanguage: movie.originalLanguage || "", releaseDate: movie.releaseDate || "",
      runtime: movie.runtime || null, tmdbPopularity: movie.popularity || 0,
      tmdbVoteCount: movie.voteCount || 0, tmdbRating: movie.voteAverage || null,
      certification: movie.certification || null,
      inputSources: movie.inputSources || ["tmdb"],
      classifierModel: MODEL, classifiedAt: new Date().toISOString(), classifierVersion: "2.0.0",
      ...moodScore,
    };
    appendFileSync(OUTPUT_FILE, JSON.stringify(record) + "\n");
    succeeded++;
  }
  return { succeeded, failed };
}

async function main() {
  console.log("=== Resume Batch Classification ===\n");

  // Load all corpus movies
  const corpusLines = readFileSync(CORPUS_FILE, "utf-8").split("\n").filter(Boolean);
  const allMovies = corpusLines.map((l) => JSON.parse(l));
  console.log(`Corpus: ${allMovies.length} movies`);

  // Check existing results
  let existingIds = loadExistingIds();
  console.log(`Already classified: ${existingIds.size}`);

  // Check pending batches
  const logLines = existsSync(BATCH_LOG) ? readFileSync(BATCH_LOG, "utf-8").split("\n").filter(Boolean) : [];
  const pendingBatches = logLines.map((l) => JSON.parse(l));

  // Poll and download any pending batches
  for (const entry of pendingBatches) {
    console.log(`\nChecking batch ${entry.batchId}...`);
    const batch = await client.messages.batches.retrieve(entry.batchId);
    console.log(`  Status: ${batch.processing_status}`);
    console.log(`  Counts:`, batch.request_counts);

    if (batch.processing_status === "ended") {
      // Build lookup for this batch's movies
      const batchMovies = allMovies.filter((m) => !existingIds.has(m.tmdbId)).slice(0, entry.movieCount);
      const lookup = new Map(batchMovies.map((m) => [`tmdb-${m.tmdbId}`, m]));

      console.log(`  Downloading results...`);
      const { succeeded, failed } = await downloadBatchResults(entry.batchId, lookup);
      console.log(`  Downloaded: ${succeeded} ok, ${failed} err`);

      existingIds = loadExistingIds();
    } else if (batch.processing_status === "in_progress") {
      // Wait for it
      console.log(`  Waiting for batch to complete...`);
      let status = batch.processing_status;
      while (status !== "ended") {
        await sleep(POLL_MS);
        const updated = await client.messages.batches.retrieve(entry.batchId);
        status = updated.processing_status;
        const c = updated.request_counts;
        const done = c.succeeded + c.errored + c.expired + c.canceled;
        console.log(`  ${done}/${done + c.processing} (${c.succeeded} ok, ${c.errored} err)`);
      }

      // Download
      const batchMovies = allMovies.filter((m) => !existingIds.has(m.tmdbId)).slice(0, entry.movieCount);
      const lookup = new Map(batchMovies.map((m) => [`tmdb-${m.tmdbId}`, m]));
      console.log(`  Downloading results...`);
      const { succeeded, failed } = await downloadBatchResults(entry.batchId, lookup);
      console.log(`  Downloaded: ${succeeded} ok, ${failed} err`);

      existingIds = loadExistingIds();
    }
  }

  // Submit remaining movies
  const remaining = allMovies.filter((m) => !existingIds.has(m.tmdbId));
  console.log(`\nRemaining to classify: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log("All done!");
    return;
  }

  // Split into batches
  const batches = [];
  for (let i = 0; i < remaining.length; i += MAX_PER_BATCH) {
    batches.push(remaining.slice(i, i + MAX_PER_BATCH));
  }
  console.log(`Submitting ${batches.length} batch(es)...\n`);

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batchMovies = batches[bIdx];
    console.log(`── Batch ${bIdx + 1}/${batches.length} (${batchMovies.length} movies) ──`);

    const requests = batchMovies.map((movie) => ({
      custom_id: `tmdb-${movie.tmdbId}`,
      params: {
        model: MODEL, max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(movie) }],
      },
    }));

    const batch = await client.messages.batches.create({ requests });
    console.log(`  Submitted: ${batch.id}`);
    appendFileSync(BATCH_LOG, JSON.stringify({
      batchId: batch.id, submittedAt: new Date().toISOString(),
      movieCount: batchMovies.length,
    }) + "\n");

    // Poll
    let status = batch.processing_status;
    while (status !== "ended") {
      await sleep(POLL_MS);
      const updated = await client.messages.batches.retrieve(batch.id);
      status = updated.processing_status;
      const c = updated.request_counts;
      const done = c.succeeded + c.errored + c.expired + c.canceled;
      console.log(`  ${done}/${done + c.processing} (${c.succeeded} ok, ${c.errored} err)`);
    }

    // Download
    const lookup = new Map(batchMovies.map((m) => [`tmdb-${m.tmdbId}`, m]));
    console.log(`  Downloading results...`);
    const { succeeded, failed } = await downloadBatchResults(batch.id, lookup);
    console.log(`  Done: ${succeeded} ok, ${failed} err\n`);
  }

  const finalCount = loadExistingIds().size;
  console.log(`=== COMPLETE ===`);
  console.log(`Total classified: ${finalCount}/${allMovies.length}`);
}

main().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });
