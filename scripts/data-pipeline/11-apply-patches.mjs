#!/usr/bin/env node
/**
 * 11-apply-patches.mjs — apply the enum patch ledger (Phase 1a/1b).
 *
 * Takes the ledger(s) produced by 10-normalize-enums.mjs and
 * reclassify-enums.mjs and applies them in one validated pass:
 *
 *   1. canonical JSONL -> new versioned artifact (source never mutated)
 *   2. Supabase movies table (changed columns only, idempotent upserts)
 *   3. ledger rows -> score_patches table (with applied_at)
 *   4. movie_scores_baseline snapshot (only once, only when fully valid)
 *
 * Usage:
 *   node 11-apply-patches.mjs --run <runId> [--allow-remaining] [--skip-db]
 *
 * Without patches-llm-<runId>.jsonl present, the artifact still contains
 * the LLM-queued invalid values; the script then refuses to write unless
 * --allow-remaining is set, and always refuses the baseline snapshot.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "../..");
const PATCH_DIR = path.join(ROOT, "data/patches");
const SRC = path.join(ROOT, "data/movie-mood-scores.jsonl");
const OUT = path.join(ROOT, "data/movie-mood-scores-v1.0.1.jsonl");

const ARCS = ["rags-to-riches", "riches-to-rags", "man-in-a-hole", "icarus", "cinderella", "oedipus"];
const PACING = ["slow-burn", "building", "steady", "relentless", "episodic"];
const ENDINGS = ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"];
const WARNINGS = ["sudden-grief", "sexual-assault", "self-harm", "child-harm", "animal-harm", "suicide", "graphic-violence", "domestic-abuse", "psychological-manipulation"];
const EMOTIONS = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"];
const VALID = { emotionalArc: ARCS, pacing: PACING, endingType: ENDINGS, emotionalSafetyWarnings: WARNINGS, dominantEmotions: EMOTIONS };
const DB_COL = {
  emotionalArc: "emotional_arc",
  pacing: "pacing",
  endingType: "ending_type",
  emotionalSafetyWarnings: "safety_warnings",
  dominantEmotions: "dominant_emotions",
};
const ARRAY_FIELDS = new Set(["emotionalSafetyWarnings", "dominantEmotions"]);

// ── args / env ──
const args = process.argv.slice(2);
const runId = args[args.indexOf("--run") + 1];
if (!args.includes("--run") || !runId) { console.error("usage: 11-apply-patches.mjs --run <runId> [--allow-remaining] [--skip-db]"); process.exit(1); }
const allowRemaining = args.includes("--allow-remaining");
const skipDb = args.includes("--skip-db");

for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

// ── load ledgers ──
const ledger = [];
for (const kind of ["mechanical", "llm"]) {
  const f = path.join(PATCH_DIR, `patches-${kind}-${runId}.jsonl`);
  if (fs.existsSync(f)) {
    const rows = fs.readFileSync(f, "utf8").trim().split("\n").map(JSON.parse);
    ledger.push(...rows);
    console.log(`loaded ${rows.length} ${kind} patches`);
  } else console.log(`no patches-${kind}-${runId}.jsonl (${kind === "llm" ? "LLM batch not fetched yet" : "missing!"})`);
}
if (!ledger.length) { console.error("no patches to apply"); process.exit(1); }

const byMovie = new Map();
for (const p of ledger) {
  if (!byMovie.has(p.tmdbId)) byMovie.set(p.tmdbId, []);
  byMovie.get(p.tmdbId).push(p);
}

// ── pass 1: apply to JSONL, collect DB updates ──
const stats = { applied: 0, alreadyApplied: 0, mismatched: 0, remainingInvalid: 0 };
const dbUpdates = new Map(); // tmdbId -> {col: value}
const remaining = new Map(); // field -> count of still-invalid values
const out = fs.createWriteStream(OUT + ".tmp");
let rows = 0;

const rl = readline.createInterface({ input: fs.createReadStream(SRC) });
for await (const line of rl) {
  const m = JSON.parse(line);
  rows++;
  const patches = byMovie.get(m.tmdbId) || [];
  const touched = new Set();

  for (const p of patches) {
    if (ARRAY_FIELDS.has(p.field)) {
      const arr = m[p.field] || [];
      const idx = arr.indexOf(p.old);
      if (idx === -1) {
        // old value absent: applied previously, or drifted
        const already = p.new === null || arr.includes(p.new);
        already ? stats.alreadyApplied++ : stats.mismatched++;
        continue;
      }
      arr.splice(idx, 1);
      if (p.new !== null && !arr.includes(p.new)) arr.push(p.new);
      m[p.field] = arr;
      touched.add(p.field);
      stats.applied++;
    } else {
      if (m[p.field] !== p.old) {
        m[p.field] === p.new ? stats.alreadyApplied++ : stats.mismatched++;
        continue;
      }
      m[p.field] = p.new;
      touched.add(p.field);
      stats.applied++;
    }
  }

  if (touched.size && !skipDb) {
    const cols = {};
    for (const f of touched) cols[DB_COL[f]] = m[f];
    dbUpdates.set(m.tmdbId, cols);
  }

  // count values that remain out-of-schema (LLM queue not applied yet)
  for (const [field, valid] of Object.entries(VALID)) {
    const v = m[field];
    const bad = Array.isArray(v) ? v.some((x) => !valid.includes(x)) : !valid.includes(v);
    if (bad) {
      stats.remainingInvalid++;
      remaining.set(field, (remaining.get(field) || 0) + 1);
    }
  }

  out.write(JSON.stringify(m) + "\n");
}
await new Promise((res) => out.end(res));

console.log(`\nrows: ${rows}`);
console.log(`patches applied: ${stats.applied}, already-applied: ${stats.alreadyApplied}, MISMATCHED: ${stats.mismatched}`);
console.log(`values still out-of-schema: ${stats.remainingInvalid}`, Object.fromEntries(remaining));

if (stats.mismatched > 0) {
  console.error("aborting: mismatched patches mean the ledger no longer matches the source");
  fs.unlinkSync(OUT + ".tmp");
  process.exit(1);
}
if (stats.remainingInvalid > 0 && !allowRemaining) {
  console.error("aborting: out-of-schema values remain (LLM patches missing?). Use --allow-remaining to write anyway.");
  fs.unlinkSync(OUT + ".tmp");
  process.exit(1);
}
fs.renameSync(OUT + ".tmp", OUT);
console.log(`wrote ${OUT}`);

if (skipDb) { console.log("--skip-db: done"); process.exit(0); }

// ── pass 2: Supabase ──
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log(`\nupdating ${dbUpdates.size} movies in Supabase...`);
const entries = [...dbUpdates.entries()];
let dbErrors = 0;
for (let i = 0; i < entries.length; i += 500) {
  // group this batch by identical column sets so each upsert carries uniform columns
  const groups = new Map();
  for (const [tmdbId, cols] of entries.slice(i, i + 500)) {
    const key = Object.keys(cols).sort().join(",");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ tmdb_id: tmdbId, ...cols });
  }
  for (const rowsGroup of groups.values()) {
    const { error } = await supabase.from("movies").upsert(rowsGroup, { onConflict: "tmdb_id" });
    if (error) { console.error("  batch error:", error.message.slice(0, 140)); dbErrors++; }
  }
  if (i % 5000 === 0) console.log(`  ${Math.min(i + 500, entries.length)}/${entries.length}`);
}
if (dbErrors) { console.error(`${dbErrors} update batches failed — NOT writing ledger or baseline`); process.exit(1); }

console.log("inserting ledger into score_patches...");
const now = new Date().toISOString();
for (let i = 0; i < ledger.length; i += 500) {
  const batch = ledger.slice(i, i + 500).map((p) => ({
    movie_id: p.tmdbId,
    field: DB_COL[p.field] || p.field,
    old_value: p.old,
    new_value: p.new,
    method: p.method,
    rule: p.rule,
    run_id: p.runId,
    model: p.method === "llm-reclassify" ? p.rule.split("/")[0] : null,
    prompt_version: p.method === "llm-reclassify" ? p.rule.split("/")[1] : null,
    applied_at: now,
  }));
  const { error } = await supabase.from("score_patches").insert(batch);
  if (error) { console.error("  ledger insert error:", error.message.slice(0, 140)); process.exit(1); }
}

// ── pass 3: baseline snapshot (once, only when fully clean) ──
if (stats.remainingInvalid > 0) {
  console.log("skipping baseline snapshot: out-of-schema values remain");
  process.exit(0);
}
const { count: baselineCount } = await supabase.from("movie_scores_baseline").select("tmdb_id", { count: "exact", head: true });
if (baselineCount > 0) {
  console.log(`baseline already snapshotted (${baselineCount} rows) — immutable, not touching`);
  process.exit(0);
}
console.log("snapshotting movie_scores_baseline from movies...");
const MOOD_COLS = "tmdb_id,valence,arousal,dominance,absorption,hedonic,eudaimonic,psych_rich,emotional_arc,dominant_emotions,mood_tags,watch_context,vibe_sentence,pacing,ending_type,comfort_level,safety_warnings,conversation_potential";
let from = 0, snap = 0;
for (;;) {
  const { data, error } = await supabase.from("movies").select(MOOD_COLS).order("tmdb_id").range(from, from + 999);
  if (error) { console.error(error.message); process.exit(1); }
  if (!data.length) break;
  const { error: insErr } = await supabase.from("movie_scores_baseline").insert(data);
  if (insErr) { console.error(insErr.message); process.exit(1); }
  snap += data.length;
  from += 1000;
}
console.log(`baseline snapshot: ${snap} rows`);

// post-validate: no invalid enums left in DB
for (const [col, valid] of [["emotional_arc", ARCS], ["pacing", PACING], ["ending_type", ENDINGS]]) {
  const { count } = await supabase.from("movies").select("tmdb_id", { count: "exact", head: true })
    .not(col, "in", `(${valid.map((v) => `"${v}"`).join(",")})`);
  console.log(`DB invalid ${col}: ${count}`);
}
console.log("done");
