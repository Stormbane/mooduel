/**
 * Seed the Supabase movies table from the canonical classifier output.
 *
 * Reads (in priority order):
 *   data/movie-mood-scores-v1.0.1.jsonl  — normalized artifact, if present
 *   data/movie-mood-scores.jsonl         — canonical classifier output
 * plus data/movie-enrichment.jsonl        — posters + RT/IMDB scores
 *
 * Everything comes from committed repo artifacts: JSONL -> Supabase is one
 * command with no ghost files (the old public/mood-data.json is gone).
 *
 * PREREQUISITE: run supabase/all_migrations.sql (+ 003_score_provenance.sql).
 *
 * Usage: npx tsx scripts/seed-movies.ts
 */

import { createClient } from "@supabase/supabase-js";
import { createReadStream, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Canonical classifier record (camelCase, full names) */
interface ScoreRecord {
  tmdbId: number;
  title: string;
  year: number;
  genres: string[];
  runtime: number | null;
  tmdbRating: number | null;
  valence: number;
  arousal: number;
  dominance: number;
  absorptionPotential: number;
  hedonicValence: number;
  eudaimonicValence: number;
  psychologicallyRichValence: number;
  emotionalArc: string;
  dominantEmotions: string[];
  moodTags: string[];
  watchContext: string[];
  vibeSentence: string;
  pacing: string;
  endingType: string;
  comfortLevel: number;
  emotionalSafetyWarnings: string[];
  conversationPotential: number;
}

interface Enrichment {
  posterPath: string | null;
  rtCritic: number | null;
  rtAudience: number | null;
  imdbRating: number | null;
}

function toRow(m: ScoreRecord, e: Enrichment | undefined) {
  return {
    tmdb_id: m.tmdbId,
    title: m.title,
    year: m.year,
    genres: m.genres,
    runtime: m.runtime,
    tmdb_rating: m.tmdbRating,
    poster_path: e?.posterPath ?? null,
    valence: m.valence,
    arousal: m.arousal,
    dominance: m.dominance,
    absorption: m.absorptionPotential,
    hedonic: m.hedonicValence,
    eudaimonic: m.eudaimonicValence,
    psych_rich: m.psychologicallyRichValence,
    emotional_arc: m.emotionalArc,
    dominant_emotions: m.dominantEmotions,
    mood_tags: m.moodTags,
    watch_context: m.watchContext,
    vibe_sentence: m.vibeSentence,
    pacing: m.pacing,
    ending_type: m.endingType,
    comfort_level: m.comfortLevel,
    safety_warnings: m.emotionalSafetyWarnings,
    conversation_potential: m.conversationPotential,
    rt_critic: e?.rtCritic ?? null,
    rt_audience: e?.rtAudience ?? null,
    imdb_rating: e?.imdbRating ?? null,
  };
}

async function seed() {
  const patched = resolve(__dirname, "../data/movie-mood-scores-v1.0.1.jsonl");
  const canonical = resolve(__dirname, "../data/movie-mood-scores.jsonl");
  const src = existsSync(patched) ? patched : canonical;
  console.log(`Source: ${src}`);

  const enrichment = new Map<number, Enrichment>();
  const enrichmentPath = resolve(__dirname, "../data/movie-enrichment.jsonl");
  if (existsSync(enrichmentPath)) {
    for (const line of readFileSync(enrichmentPath, "utf-8").trim().split("\n")) {
      const e = JSON.parse(line);
      enrichment.set(e.tmdbId, e);
    }
    console.log(`Enrichment loaded: ${enrichment.size} rows`);
  } else {
    console.warn("No data/movie-enrichment.jsonl — posters/RT/IMDB will be null");
  }

  const BATCH = 500;
  let batch: ReturnType<typeof toRow>[] = [];
  let processed = 0;
  let errors = 0;

  const flush = async () => {
    if (!batch.length) return;
    const { error } = await supabase.from("movies").upsert(batch, { onConflict: "tmdb_id" });
    if (error) {
      console.error(`  batch @${processed} failed:`, error.message.slice(0, 140));
      errors++;
    }
    processed += batch.length;
    if (processed % 5000 < BATCH) console.log(`  ${processed} processed (${errors} errored batches)`);
    batch = [];
  };

  const rl = createInterface({ input: createReadStream(src) });
  for await (const line of rl) {
    const m: ScoreRecord = JSON.parse(line);
    batch.push(toRow(m, enrichment.get(m.tmdbId)));
    if (batch.length >= BATCH) await flush();
  }
  await flush();

  const { count } = await supabase
    .from("movies")
    .select("tmdb_id", { count: "exact", head: true });
  console.log(`\nDone. ${count} movies in database (${errors} errored batches).`);
  if (errors > 0) process.exit(1);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
