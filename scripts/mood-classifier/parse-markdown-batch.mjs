/**
 * Parse batch 1 markdown results into structured JSON.
 * The LLM returned prose instead of JSON, but the scores are embedded in the text.
 * This script extracts them using regex patterns.
 *
 * Usage: node scripts/mood-classifier/parse-markdown-batch.mjs
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, appendFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const CORPUS_FILE = join(PROJECT_ROOT, "data", "movie-input-corpus.jsonl");
const OUTPUT_FILE = join(PROJECT_ROOT, "data", "movie-mood-scores.jsonl");
const MODEL = "claude-haiku-4-5-20251001";
const BATCH_ID = "msgbatch_0144aJe2tMjW29qan2V8sX4V";

// Load env
const envFile = join(PROJECT_ROOT, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const m = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
    if (m) process.env.ANTHROPIC_API_KEY = m[1].trim();
  }
}

const client = new Anthropic();

// Build corpus lookup
const corpusLines = readFileSync(CORPUS_FILE, "utf-8").split("\n").filter(Boolean);
const corpusMap = new Map();
for (const line of corpusLines) {
  const m = JSON.parse(line);
  corpusMap.set(`tmdb-${m.tmdbId}`, m);
}

function extractNumber(text, pattern) {
  const match = text.match(pattern);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return isNaN(val) ? null : val;
}

function extractEnum(text, pattern, options) {
  const match = text.match(pattern);
  if (!match) return null;
  const val = match[1].toLowerCase().trim();
  return options.find(o => val.includes(o)) || null;
}

function extractList(text, pattern) {
  const match = text.match(pattern);
  if (!match) return [];
  return match[1].split(/[,;]/).map(s => s.trim().toLowerCase().replace(/[*_]/g, '')).filter(Boolean);
}

function parseMarkdownMood(text) {
  const t = text;

  // Core affect
  const valence = extractNumber(t, /\*?\*?Valence[:\s]*\*?\*?\s*([+-]?\d+\.?\d*)/i);
  const arousal = extractNumber(t, /\*?\*?Arousal[:\s]*\*?\*?\s*([+-]?\d+\.?\d*)/i);
  const dominance = extractNumber(t, /\*?\*?Dominance[:\s]*\*?\*?\s*([+-]?\d+\.?\d*)/i);

  // Absorption
  const absorptionPotential = extractNumber(t, /Absorption[^:]*[:\s]*\*?\*?\s*([0-9]+\.?\d*)/i);

  // Three valences
  const hedonicValence = extractNumber(t, /\*?\*?Hedonic[:\s]*\*?\*?\s*([0-9]+\.?\d*)/i);
  const eudaimonicValence = extractNumber(t, /\*?\*?Eudaimonic[:\s]*\*?\*?\s*([0-9]+\.?\d*)/i);
  const psychologicallyRichValence = extractNumber(t, /\*?\*?Psychologically Rich[:\s]*\*?\*?\s*([0-9]+\.?\d*)/i);

  // Emotional arc
  const arcs = ["rags-to-riches", "riches-to-rags", "man-in-a-hole", "icarus", "cinderella", "oedipus"];
  let emotionalArc = null;
  for (const arc of arcs) {
    if (t.toLowerCase().includes(arc)) { emotionalArc = arc; break; }
  }

  // Dominant emotions
  const plutchik = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"];
  const dominantEmotions = plutchik.filter(e => {
    const regex = new RegExp(`\\b${e}\\b`, 'i');
    // Only count if it appears in the emotions section or is bolded
    const emotionSection = t.match(/emotions?[^]*?(?=\n##|\n---|\*\*Mood Tags)/is);
    if (emotionSection) return regex.test(emotionSection[0]);
    return false;
  }).slice(0, 3);

  // Mood tags
  const tagSection = t.match(/Mood Tags[^]*?(?=\n##|\n---|\*\*Watch|$)/is);
  let moodTags = [];
  if (tagSection) {
    const tagMatches = tagSection[0].match(/`([^`]+)`/g) || [];
    moodTags = tagMatches.map(t => t.replace(/`/g, '').toLowerCase()).slice(0, 6);
    if (moodTags.length === 0) {
      // Try bullet points
      const bullets = tagSection[0].match(/[-•]\s*\*?\*?([a-z][\w-]+)/gi) || [];
      moodTags = bullets.map(b => b.replace(/[-•]\s*\*?\*?/g, '').trim().toLowerCase()).slice(0, 6);
    }
  }

  // Watch context
  const contexts = ["solo", "date", "friends", "family"];
  const watchSection = t.match(/Watch Context[^]*?(?=\n##|\n---|\*\*Vibe)/is);
  let watchContext = [];
  if (watchSection) {
    watchContext = contexts.filter(c => watchSection[0].toLowerCase().includes(c));
  }
  if (watchContext.length === 0) {
    watchContext = contexts.filter(c => {
      const regex = new RegExp(`\\b${c}\\b`, 'i');
      return regex.test(t);
    }).slice(0, 3);
  }
  if (watchContext.length === 0) watchContext = ["solo"];

  // Vibe sentence
  let vibeSentence = "";
  const vibeMatch = t.match(/Vibe Sentence[^:]*:\s*\*?\*?"?([^"\n]+)"?/i) ||
                    t.match(/\*?\*?Vibe[^:]*:\*?\*?\s*"?([^"\n]{10,80})"?/i);
  if (vibeMatch) vibeSentence = vibeMatch[1].replace(/\*?\*?/g, '').replace(/^["']|["']$/g, '').trim();

  // Pacing
  const pacingOptions = ["slow-burn", "building", "steady", "relentless", "episodic"];
  let pacing = null;
  for (const p of pacingOptions) {
    if (t.toLowerCase().includes(p)) { pacing = p; break; }
  }

  // Ending type
  const endingOptions = ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"];
  let endingType = null;
  const endingSection = t.match(/Ending[^]*?(?=\n##|\n---|\*\*Comfort)/is);
  if (endingSection) {
    for (const e of endingOptions) {
      if (endingSection[0].toLowerCase().includes(e)) { endingType = e; break; }
    }
  }
  if (!endingType) {
    for (const e of endingOptions) {
      if (t.toLowerCase().includes(e)) { endingType = e; break; }
    }
  }

  // Comfort level
  const comfortLevel = extractNumber(t, /Comfort[^:]*[:\s]*\*?\*?\s*([0-9]+\.?\d*)/i);

  // Safety warnings
  const warningOptions = ["sudden-grief", "sexual-assault", "self-harm", "child-harm", "animal-harm", "suicide", "graphic-violence", "domestic-abuse", "psychological-manipulation"];
  const emotionalSafetyWarnings = warningOptions.filter(w => t.toLowerCase().includes(w));

  // Conversation potential
  const conversationPotential = extractNumber(t, /Conversation[^:]*[:\s]*\*?\*?\s*([0-9]+\.?\d*)/i);

  return {
    valence, arousal, dominance, absorptionPotential,
    hedonicValence, eudaimonicValence, psychologicallyRichValence,
    emotionalArc, dominantEmotions, moodTags,
    watchContext, vibeSentence, pacing, endingType,
    comfortLevel, emotionalSafetyWarnings,
    conversationPotential,
  };
}

async function main() {
  console.log("=== Parsing Batch 1 Markdown Results ===\n");

  // Load existing
  const existingIds = new Set();
  if (existsSync(OUTPUT_FILE)) {
    for (const line of readFileSync(OUTPUT_FILE, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      try { existingIds.add(JSON.parse(line).tmdbId); } catch {}
    }
  }
  console.log(`Already in output: ${existingIds.size}`);

  const results = await client.messages.batches.results(BATCH_ID);
  let succeeded = 0, failed = 0, skipped = 0, partial = 0;

  for await (const result of results) {
    const movie = corpusMap.get(result.custom_id);
    if (!movie) { failed++; continue; }
    if (existingIds.has(movie.tmdbId)) { skipped++; continue; }
    if (result.result?.type !== "succeeded") { failed++; continue; }

    const text = result.result.message.content.find(c => c.type === "text")?.text;
    if (!text) { failed++; continue; }

    const mood = parseMarkdownMood(text);

    // Check we got the critical fields
    const hasCritical = mood.valence !== null && mood.arousal !== null && mood.dominance !== null;
    if (!hasCritical) { failed++; continue; }

    // Count missing optional fields
    const optionalMissing = [
      mood.absorptionPotential === null,
      mood.hedonicValence === null,
      mood.vibeSentence === "",
      mood.pacing === null,
      mood.endingType === null,
    ].filter(Boolean).length;
    if (optionalMissing > 2) partial++;

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
      classifierModel: MODEL, classifiedAt: new Date().toISOString(), classifierVersion: "2.0.0-parsed",
      ...mood,
      // Defaults for missing optional fields
      absorptionPotential: mood.absorptionPotential ?? 0.5,
      hedonicValence: mood.hedonicValence ?? 0.5,
      eudaimonicValence: mood.eudaimonicValence ?? 0.5,
      psychologicallyRichValence: mood.psychologicallyRichValence ?? 0.5,
      emotionalArc: mood.emotionalArc ?? "man-in-a-hole",
      dominantEmotions: mood.dominantEmotions.length > 0 ? mood.dominantEmotions : ["anticipation", "trust"],
      moodTags: mood.moodTags.length > 0 ? mood.moodTags : [],
      watchContext: mood.watchContext,
      vibeSentence: mood.vibeSentence || "",
      pacing: mood.pacing ?? "building",
      endingType: mood.endingType ?? "bittersweet",
      comfortLevel: mood.comfortLevel ?? 0.5,
      emotionalSafetyWarnings: mood.emotionalSafetyWarnings,
      conversationPotential: mood.conversationPotential ?? 0.5,
    };

    appendFileSync(OUTPUT_FILE, JSON.stringify(record) + "\n");
    succeeded++;

    if (succeeded % 1000 === 0) console.log(`  ${succeeded} parsed...`);
  }

  console.log(`\n=== Results ===`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Partial (2+ missing optional): ${partial}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (already exists): ${skipped}`);
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
