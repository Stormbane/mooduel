/**
 * Seed the Supabase movies table from mood-data.json using the REST API.
 *
 * PREREQUISITE: Run supabase/all_migrations.sql in the Supabase Dashboard SQL Editor first.
 *
 * Usage: npx tsx scripts/seed-movies.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SlimMovie {
  id: number;
  t: string;
  y: number;
  g: string[];
  rt: number | null;
  r: number | null;
  v: string;
  va: number;
  ar: number;
  do: number;
  ab: number;
  he: number;
  eu: number;
  pr: number;
  arc: string;
  em: string[];
  tags: string[];
  wc: string[];
  pa: string;
  end: string;
  co: number;
  warn: string[];
  conv: number;
  rtc?: number;
  rta?: number;
  imdb?: number;
  pp?: string;
}

function toRow(m: SlimMovie) {
  return {
    tmdb_id: m.id,
    title: m.t,
    year: m.y,
    genres: m.g,
    runtime: m.rt,
    tmdb_rating: m.r,
    poster_path: m.pp || null,
    valence: m.va,
    arousal: m.ar,
    dominance: m.do,
    absorption: m.ab,
    hedonic: m.he,
    eudaimonic: m.eu,
    psych_rich: m.pr,
    emotional_arc: m.arc,
    dominant_emotions: m.em,
    mood_tags: m.tags,
    watch_context: m.wc,
    vibe_sentence: m.v,
    pacing: m.pa,
    ending_type: m.end,
    comfort_level: m.co,
    safety_warnings: m.warn,
    conversation_potential: m.conv,
    rt_critic: m.rtc ?? null,
    rt_audience: m.rta ?? null,
    imdb_rating: m.imdb ?? null,
  };
}

async function seed() {
  console.log("Loading mood-data.json...");
  const raw = readFileSync(
    resolve(__dirname, "../public/mood-data.json"),
    "utf-8"
  );
  const movies: SlimMovie[] = JSON.parse(raw);
  console.log(`Loaded ${movies.length} movies.`);

  // Check if table exists
  const { error: checkErr } = await supabase
    .from("movies")
    .select("tmdb_id")
    .limit(1);
  if (checkErr) {
    console.error(
      "Movies table not found. Run supabase/all_migrations.sql in the Supabase Dashboard SQL Editor first."
    );
    console.error("Error:", checkErr.message);
    process.exit(1);
  }

  // Check existing count
  const { count } = await supabase
    .from("movies")
    .select("tmdb_id", { count: "exact", head: true });
  if (count && count > 0) {
    console.log(`Table already has ${count} rows. Upserting...`);
  }

  // Insert in batches of 500 (Supabase REST API limit is ~1000 per request)
  const BATCH = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < movies.length; i += BATCH) {
    const batch = movies.slice(i, i + BATCH).map(toRow);

    const { error } = await supabase.from("movies").upsert(batch, {
      onConflict: "tmdb_id",
    });

    if (error) {
      console.error(
        `  Batch ${i}-${i + batch.length} failed:`,
        error.message.slice(0, 120)
      );
      errors++;
    } else {
      inserted += batch.length;
    }

    // Progress every 10 batches
    if (i % (BATCH * 10) === 0 || i + BATCH >= movies.length) {
      console.log(
        `  ${Math.min(inserted + errors * BATCH, movies.length)}/${movies.length} processed (${errors} errors)...`
      );
    }
  }

  // Verify
  const { count: finalCount } = await supabase
    .from("movies")
    .select("tmdb_id", { count: "exact", head: true });

  console.log(`\nDone. ${finalCount} movies in database.`);
  if (errors > 0) console.log(`${errors} batches had errors.`);
}

seed().catch(console.error);
