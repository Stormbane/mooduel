/**
 * Step 7: Add MovieLens Tag Genome scores to the corpus.
 *
 * Streams the 415MB genome-scores.csv, keeping only scores for movies
 * in our corpus. Selects the top 15 most relevant tags per movie from
 * a curated set of mood-relevant tags.
 *
 * Usage: node scripts/data-pipeline/07-add-movielens-tags.mjs
 */

import { createReadStream, readFileSync, writeFileSync } from "fs";
import { createInterface } from "readline";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const TAGS_FILE = join(PROJECT_ROOT, "data", "raw", "movielens", "genome-tags.csv");
const SCORES_FILE = join(PROJECT_ROOT, "data", "raw", "movielens", "genome-scores.csv");
const LINKS_FILE = join(PROJECT_ROOT, "data", "raw", "movielens", "links.csv");
const CORPUS_FILE = join(PROJECT_ROOT, "data", "movie-input-corpus.jsonl");

// Tags most relevant to mood classification — curated from the 1,128 available
const MOOD_RELEVANT_TAGS = new Set([
  // Emotional tone
  "dark", "dark comedy", "feel-good", "depressing", "uplifting", "melancholy",
  "heartwarming", "gritty", "bleak", "whimsical", "bittersweet", "sentimental",
  "disturbing", "haunting", "cheerful", "tragic",
  // Intensity / arousal
  "atmospheric", "suspenseful", "tense", "intense", "slow", "fast-paced",
  "action-packed", "adrenaline rush", "edge of seat", "relaxing", "meditative",
  "quiet", "loud", "chaotic",
  // Cognitive engagement
  "thought-provoking", "cerebral", "mind-bending", "complex", "twist ending",
  "unpredictable", "predictable", "confusing", "clever", "intellectual",
  "philosophical", "subtle", "layered",
  // Experience type
  "entertaining", "fun", "funny", "hilarious", "boring", "overrated",
  "underrated", "masterpiece", "cult film", "classic", "guilty pleasure",
  "crowd pleaser", "art film", "indie",
  // Social context
  "family friendly", "date movie", "chick flick", "guy movie",
  "kids", "adult", "mature",
  // Visual / aesthetic
  "beautiful", "visually appealing", "stylized", "realistic", "surreal",
  "dreamlike", "noir", "colorful",
  // Thematic
  "revenge", "love", "friendship", "loneliness", "coming of age",
  "good versus evil", "survival", "redemption", "justice", "corruption",
  "paranoia", "identity", "loss", "grief", "hope", "nostalgia",
  "existential", "absurd", "satire", "political", "social commentary",
  // Pacing / structure
  "nonlinear", "dialogue-driven", "character-driven", "plot-driven",
  "twist ending", "surprise ending", "open ending", "ambiguous ending",
]);

async function main() {
  console.log("=== Adding MovieLens Tag Genome to Corpus ===\n");

  // Step 1: Load tag names
  const tagNames = new Map(); // tagId → tag name
  const tagLines = readFileSync(TAGS_FILE, "utf-8").split("\n");
  for (let i = 1; i < tagLines.length; i++) {
    const line = tagLines[i].trim();
    if (!line) continue;
    const comma = line.indexOf(",");
    const id = parseInt(line.slice(0, comma));
    const name = line.slice(comma + 1).replace(/^"|"$/g, "");
    tagNames.set(id, name);
  }
  console.log(`  ${tagNames.size} tags loaded`);

  // Find which tagIds are mood-relevant
  const moodTagIds = new Set();
  for (const [id, name] of tagNames) {
    if (MOOD_RELEVANT_TAGS.has(name.toLowerCase())) {
      moodTagIds.add(id);
    }
  }
  console.log(`  ${moodTagIds.size} mood-relevant tags matched`);

  // Step 2: Build MovieLens movieId → tmdbId mapping
  const mlToTmdb = new Map(); // movieLens movieId → tmdbId
  const tmdbToMl = new Map(); // tmdbId → movieLens movieId
  const linkLines = readFileSync(LINKS_FILE, "utf-8").split("\n");
  for (let i = 1; i < linkLines.length; i++) {
    const line = linkLines[i].trim();
    if (!line) continue;
    const parts = line.split(",");
    const mlId = parseInt(parts[0]);
    const tmdbId = parseInt(parts[2]);
    if (!isNaN(tmdbId) && tmdbId > 0) {
      mlToTmdb.set(mlId, tmdbId);
      tmdbToMl.set(tmdbId, mlId);
    }
  }
  console.log(`  ${mlToTmdb.size} MovieLens→TMDB links loaded`);

  // Step 3: Load corpus tmdbIds
  const corpusLines = readFileSync(CORPUS_FILE, "utf-8").split("\n").filter(Boolean);
  const corpus = corpusLines.map((l) => JSON.parse(l));
  const corpusTmdbIds = new Set(corpus.map((m) => m.tmdbId));

  // Find which MovieLens movieIds are in our corpus
  const targetMlIds = new Set();
  for (const [mlId, tmdbId] of mlToTmdb) {
    if (corpusTmdbIds.has(tmdbId)) targetMlIds.add(mlId);
  }
  console.log(`  ${targetMlIds.size} corpus movies have MovieLens IDs`);

  // Step 4: Stream genome-scores.csv, collect scores for target movies
  console.log("\nStreaming genome scores (415MB)...");
  const movieScores = new Map(); // tmdbId → Map<tagName, relevance>

  const rl = createInterface({
    input: createReadStream(SCORES_FILE, "utf-8"),
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let keptCount = 0;
  let header = false;

  for await (const line of rl) {
    if (!header) { header = true; continue; }
    lineCount++;
    if (lineCount % 2000000 === 0) process.stdout.write(`  ${(lineCount / 1000000).toFixed(0)}M lines\r`);

    // Parse: movieId,tagId,relevance
    const c1 = line.indexOf(",");
    const c2 = line.indexOf(",", c1 + 1);
    const movieId = parseInt(line.slice(0, c1));
    const tagId = parseInt(line.slice(c1 + 1, c2));
    const relevance = parseFloat(line.slice(c2 + 1));

    // Skip if not in our corpus or not a mood-relevant tag
    if (!targetMlIds.has(movieId)) continue;
    if (!moodTagIds.has(tagId)) continue;
    if (relevance < 0.3) continue; // Skip low-relevance scores

    const tmdbId = mlToTmdb.get(movieId);
    const tagName = tagNames.get(tagId);
    if (!tmdbId || !tagName) continue;

    if (!movieScores.has(tmdbId)) movieScores.set(tmdbId, new Map());
    movieScores.get(tmdbId).set(tagName, relevance);
    keptCount++;
  }

  console.log(`\n  ${lineCount} lines streamed, ${keptCount} scores kept for ${movieScores.size} movies`);

  // Step 5: Attach to corpus — top 15 tags per movie as object
  let attached = 0;
  for (const movie of corpus) {
    const scores = movieScores.get(movie.tmdbId);
    if (!scores || scores.size === 0) continue;

    // Sort by relevance, take top 15
    const sorted = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    movie.movieLensTags = Object.fromEntries(sorted.map(([tag, rel]) => [tag, Math.round(rel * 1000) / 1000]));

    if (!movie.inputSources.includes("movielens")) {
      movie.inputSources.push("movielens");
    }
    attached++;
  }

  console.log(`\n  Tags attached to ${attached} movies (${(attached / corpus.length * 100).toFixed(1)}%)`);

  // Show sample
  const sample = corpus.find((m) => m.movieLensTags && Object.keys(m.movieLensTags).length > 5);
  if (sample) {
    console.log(`\n  Sample — ${sample.title}:`);
    const tags = Object.entries(sample.movieLensTags).slice(0, 8);
    for (const [tag, rel] of tags) {
      console.log(`    ${tag}: ${rel}`);
    }
  }

  // Write
  console.log("\nWriting updated corpus...");
  const output = corpus.map((m) => JSON.stringify(m)).join("\n") + "\n";
  writeFileSync(CORPUS_FILE, output, "utf-8");
  console.log("Done.");
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
