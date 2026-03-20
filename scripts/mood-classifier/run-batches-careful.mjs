/**
 * Careful batch classification — one batch at a time, JSON enforced.
 *
 * Uses assistant prefill (starting response with "{") to force JSON output.
 * Submits one batch, waits for completion, downloads, verifies, then proceeds.
 *
 * Usage: node scripts/mood-classifier/run-batches-careful.mjs
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const CORPUS_FILE = join(PROJECT_ROOT, "data", "movie-input-corpus.jsonl");
const OUTPUT_FILE = join(PROJECT_ROOT, "data", "movie-mood-scores.jsonl");
const BATCH_LOG = join(PROJECT_ROOT, "data", "batch-log-v2.jsonl");
const SYSTEM_PROMPT = readFileSync(join(__dirname, "prompt.txt"), "utf-8");

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

// JSON-enforcing system prompt suffix
const JSON_SUFFIX = `

## Output Format

You MUST respond with a single JSON object. No markdown. No headers. No explanation.
The JSON must contain exactly these fields:
valence, arousal, dominance, absorptionPotential,
hedonicValence, eudaimonicValence, psychologicallyRichValence,
emotionalArc, dominantEmotions, moodTags,
watchContext, vibeSentence, pacing, endingType,
comfortLevel, emotionalSafetyWarnings, conversationPotential, reasoning.

The "reasoning" field should be exactly ONE short sentence. Keep total output under 500 tokens.
Start your response with { and end with }. Nothing else.`;

function buildUserPrompt(movie) {
  const parts = [`Classify this movie's mood dimensions.\n`];
  parts.push(`TITLE: ${movie.title}`);
  if (movie.originalTitle && movie.originalTitle !== movie.title) parts.push(`ORIGINAL TITLE: ${movie.originalTitle}`);
  if (movie.year) parts.push(`YEAR: ${movie.year}`);
  if (movie.genres?.length) parts.push(`GENRES: ${movie.genres.join(", ")}`);
  if (movie.runtime) parts.push(`RUNTIME: ${movie.runtime}min`);
  if (movie.originalLanguage) parts.push(`LANGUAGE: ${movie.originalLanguage}`);
  if (movie.tagline) parts.push(`TAGLINE: ${movie.tagline}`);
  if (movie.keywords?.length) parts.push(`KEYWORDS: ${movie.keywords.join(", ")}`);
  if (movie.certification) parts.push(`CERTIFICATION: ${movie.certification}`);
  if (movie.overview) parts.push(`\nOVERVIEW: ${movie.overview}`);
  if (movie.wikipediaPlot) parts.push(`\nPLOT: ${movie.wikipediaPlot.slice(0, 3000)}`);
  if (movie.reviews?.length > 0) {
    const revs = movie.reviews.slice(0, 3).map((r) => {
      const label = r.source === "rt" ? `[RT]` : "[User]";
      return `${label} (${r.sentiment || ""}) ${r.text.slice(0, 400)}`;
    });
    parts.push(`\nREVIEWS:\n${revs.join("\n")}`);
  }
  if (movie.movieLensTags && Object.keys(movie.movieLensTags).length > 0) {
    const tags = Object.entries(movie.movieLensTags).slice(0, 8).map(([t, r]) => `${t}(${r})`).join(", ");
    parts.push(`\nTAGS: ${tags}`);
  }
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

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

async function main() {
  log("=== Careful Batch Classification ===");
  log("");

  const corpusLines = readFileSync(CORPUS_FILE, "utf-8").split("\n").filter(Boolean);
  const allMovies = corpusLines.map((l) => JSON.parse(l));
  const existingIds = loadExistingIds();

  log(`Corpus: ${allMovies.length} movies`);
  log(`Already classified: ${existingIds.size}`);

  const remaining = allMovies.filter((m) => !existingIds.has(m.tmdbId));
  log(`Remaining: ${remaining.length}`);

  if (remaining.length === 0) {
    log("All done!");
    return;
  }

  // Estimate cost
  const estInputTokens = remaining.length * 3000; // slightly trimmed prompts
  const estOutputTokens = remaining.length * 350;  // JSON output
  const estCost = (estInputTokens / 1e6) * 0.50 + (estOutputTokens / 1e6) * 2.50;
  log(`Estimated cost: ~$${estCost.toFixed(2)} (batch pricing)`);
  log("");

  // Split into batches
  const batches = [];
  for (let i = 0; i < remaining.length; i += MAX_PER_BATCH) {
    batches.push(remaining.slice(i, i + MAX_PER_BATCH));
  }
  log(`Will submit ${batches.length} batch(es) sequentially`);
  log("");

  const fullSystemPrompt = SYSTEM_PROMPT + JSON_SUFFIX;

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batchMovies = batches[bIdx];
    log(`── Batch ${bIdx + 1}/${batches.length} (${batchMovies.length} movies) ──`);

    // Build requests with assistant prefill to force JSON
    const requests = batchMovies.map((movie) => ({
      custom_id: `tmdb-${movie.tmdbId}`,
      params: {
        model: MODEL,
        max_tokens: 1024,
        system: fullSystemPrompt,
        messages: [
          { role: "user", content: buildUserPrompt(movie) },
          { role: "assistant", content: "{" },  // Prefill forces JSON
        ],
      },
    }));

    // Submit
    log(`  Submitting...`);
    const batch = await client.messages.batches.create({ requests });
    log(`  Batch ID: ${batch.id}`);

    appendFileSync(BATCH_LOG, JSON.stringify({
      batchId: batch.id,
      submittedAt: new Date().toISOString(),
      batchIndex: bIdx + 1,
      movieCount: batchMovies.length,
      firstTmdbId: batchMovies[0].tmdbId,
      lastTmdbId: batchMovies[batchMovies.length - 1].tmdbId,
    }) + "\n");

    // Poll until complete
    let status = batch.processing_status;
    while (status !== "ended") {
      await sleep(POLL_MS);
      const updated = await client.messages.batches.retrieve(batch.id);
      status = updated.processing_status;
      const c = updated.request_counts;
      const done = c.succeeded + c.errored + c.expired + c.canceled;
      const total = done + c.processing;
      const pct = total > 0 ? Math.round(done / total * 100) : 0;
      log(`  ${done}/${total} (${pct}%) — ${c.succeeded} ok, ${c.errored} err`);
    }

    // Download results
    log(`  Downloading results...`);
    const lookup = new Map(batchMovies.map((m) => [`tmdb-${m.tmdbId}`, m]));
    let succeeded = 0, failed = 0, jsonErrors = 0;

    const results = await client.messages.batches.results(batch.id);
    for await (const result of results) {
      const movie = lookup.get(result.custom_id);
      if (!movie) { failed++; continue; }
      if (result.result?.type !== "succeeded") { failed++; continue; }

      const textBlock = result.result.message.content.find((c) => c.type === "text");
      if (!textBlock) { failed++; continue; }

      // The prefill started with "{", so the response continues from there
      // Reconstruct the full JSON
      const rawText = "{" + textBlock.text;

      let moodScore;
      try {
        moodScore = JSON.parse(rawText);
      } catch {
        // If truncated by max_tokens, try closing the JSON
        const stopReason = result.result.message.stop_reason;
        if (stopReason === "max_tokens") {
          const lastComma = rawText.lastIndexOf(",\n");
          if (lastComma > 0) {
            try { moodScore = JSON.parse(rawText.slice(0, lastComma) + "\n}"); } catch {}
          }
        }
        // Try extracting JSON object
        if (!moodScore) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try { moodScore = JSON.parse(jsonMatch[0]); } catch {}
          }
        }
        if (!moodScore) { jsonErrors++; failed++; continue; }
      }

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

    log(`  ✓ Done: ${succeeded} ok, ${failed} failed, ${jsonErrors} JSON parse errors`);
    log("");

    // Verify before proceeding to next batch
    const totalNow = loadExistingIds().size;
    log(`  Total classified so far: ${totalNow}/${allMovies.length}`);
    log("");
  }

  const finalCount = loadExistingIds().size;
  log(`=== COMPLETE ===`);
  log(`Total classified: ${finalCount}/${allMovies.length}`);
  log(`Success rate: ${(finalCount / allMovies.length * 100).toFixed(1)}%`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  if (err.status) console.error("Status:", err.status);
  process.exit(1);
});
