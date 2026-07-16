#!/usr/bin/env node
/**
 * aggregate.mjs — the weekly calibration run (Phase 2c/2d).
 *
 * Reads the raw signal stream, fits regularized Bayesian Bradley-Terry per
 * continuous dimension, blends with the LLM prior by posterior precision,
 * relabels categorical dimensions by majority, and writes a complete
 * immutable run to calibration_runs + movie_scores_calibrated.
 *
 * NOTHING here touches the serving columns. Promotion is a separate,
 * deliberate step that runs the atomic promote_calibration_run() function
 * after validation (see plan §2d and the shadow-run gate in §Phase 4).
 *
 * Usage:
 *   node aggregate.mjs run                # create a completed (unpromoted) run
 *   node aggregate.mjs promote <runId>    # atomically promote a completed run
 *
 * Anchors (optional): data/calibration/anchors.json
 *   { "<dimension>": { "<tmdbId>": <absoluteValue>, ... }, ... }
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fitBradleyTerry, mapToScale, blend, categoricalMajority } from "./bt.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CONTINUOUS = {
  valence: [-1, 1], arousal: [-1, 1], dominance: [-1, 1],
  absorption: [0, 1], hedonic: [0, 1], eudaimonic: [0, 1], psych_rich: [0, 1],
  comfort_level: [0, 1], conversation_potential: [0, 1],
};
const CATEGORICAL = {
  emotional_arc: ["rags-to-riches", "riches-to-rags", "man-in-a-hole", "icarus", "cinderella", "oedipus"],
  ending_type: ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"],
  pacing: ["slow-burn", "building", "steady", "relentless", "episodic"],
};
const MIN_LATENCY_MS = 400;
const POLICY_VERSION = "aggregate-v1";

const [, , cmd, arg] = process.argv;

async function fetchAll(table, select, filter = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(
      supabase.from(table).select(select).range(from, from + 999)
    );
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

if (cmd === "run") {
  const runId = `cal-${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(3).toString("hex")}`;
  console.log(`run: ${runId}`);

  const { error: runErr } = await supabase.from("calibration_runs").insert({ run_id: runId, policy_version: POLICY_VERSION });
  if (runErr) throw new Error(runErr.message);

  const fail = async (msg) => {
    await supabase.from("calibration_runs").update({ status: "failed", finished_at: new Date().toISOString(), diagnostics: { error: msg } }).eq("run_id", runId);
    console.error(`run failed: ${msg}`);
    process.exit(1);
  };

  try {
    // ── signals, with aggregation-time abuse filters ──
    const raw = await fetchAll("calibration_signals", "session_id,kind,dimension,movie_a,movie_b,choice,latency_ms,received_at", (q) => q.order("received_at"));
    const seenPair = new Set();
    const pairwise = [];
    const categorical = [];
    let droppedFast = 0, droppedDup = 0;
    for (const s of raw) {
      if (s.latency_ms !== null && s.latency_ms < MIN_LATENCY_MS) { droppedFast++; continue; }
      if (s.kind === "pairwise") {
        const [lo, hi] = [Math.min(s.movie_a, s.movie_b), Math.max(s.movie_a, s.movie_b)];
        const key = `${s.session_id}|${s.dimension}|${lo}-${hi}`;
        if (seenPair.has(key)) { droppedDup++; continue; }
        seenPair.add(key);
        pairwise.push(s);
      } else if (s.kind === "categorical") {
        categorical.push(s);
      }
    }
    console.log(`signals: ${raw.length} raw, ${pairwise.length} pairwise + ${categorical.length} categorical kept (dropped ${droppedFast} fast, ${droppedDup} dup)`);

    // ── anchors ──
    const anchorsPath = path.join(ROOT, "data/calibration/anchors.json");
    const anchorsAll = fs.existsSync(anchorsPath) ? JSON.parse(fs.readFileSync(anchorsPath, "utf8")) : {};

    // ── current serving values (the prior for this run) ──
    const MOOD_COLS = "tmdb_id,valence,arousal,dominance,absorption,hedonic,eudaimonic,psych_rich,emotional_arc,dominant_emotions,mood_tags,watch_context,vibe_sentence,pacing,ending_type,comfort_level,safety_warnings,conversation_potential";
    const movies = await fetchAll("movies", MOOD_COLS, (q) => q.order("tmdb_id"));
    const byId = new Map(movies.map((m) => [m.tmdb_id, m]));
    console.log(`movies: ${movies.length}`);

    // ── continuous dimensions ──
    const diagnostics = { policy: POLICY_VERSION, signals: { raw: raw.length, pairwise: pairwise.length, categorical: categorical.length, droppedFast, droppedDup }, dimensions: {} };
    const calibratedValues = new Map(); // tmdbId -> {col: value}
    const votesCount = new Map();       // tmdbId -> {col: n}
    const postVar = new Map();          // tmdbId -> {col: var}

    for (const [dim, bounds] of Object.entries(CONTINUOUS)) {
      const votes = pairwise
        .filter((s) => s.dimension === dim)
        .map((s) => ({ winner: s.choice === "a" ? s.movie_a : s.movie_b, loser: s.choice === "a" ? s.movie_b : s.movie_a }));
      if (votes.length < 20) { diagnostics.dimensions[dim] = { votes: votes.length, skipped: true }; continue; }

      const fit = fitBradleyTerry(votes);
      const prior = new Map(fit.ids.map((id) => [id, byId.get(id)?.[dim] ?? 0]));
      const anchors = anchorsAll[dim] ? new Map(Object.entries(anchorsAll[dim]).map(([k, v]) => [Number(k), v])) : null;
      const { map, method } = mapToScale(fit.theta, prior, anchors, bounds);

      let moved = 0;
      for (const id of fit.ids) {
        const prec = fit.precision.get(id);
        const value = blend(map(id), prior.get(id), prec);
        if (!calibratedValues.has(id)) { calibratedValues.set(id, {}); votesCount.set(id, {}); postVar.set(id, {}); }
        calibratedValues.get(id)[dim] = value;
        votesCount.get(id)[dim] = votes.filter((v) => v.winner === id || v.loser === id).length;
        postVar.get(id)[dim] = 1 / (prec + 1);
        if (Math.abs(value - prior.get(id)) > 0.01) moved++;
      }
      diagnostics.dimensions[dim] = { votes: votes.length, movies: fit.ids.length, components: fit.components, scaleMethod: method, movedOver0_01: moved };
      console.log(`  ${dim}: ${votes.length} votes, ${fit.ids.length} movies, ${fit.components} components, ${method}`);
    }

    // ── categorical dimensions ──
    for (const [dim, valid] of Object.entries(CATEGORICAL)) {
      const byMovie = new Map();
      for (const s of categorical.filter((s) => s.dimension === dim && valid.includes(s.choice))) {
        if (!byMovie.has(s.movie_a)) byMovie.set(s.movie_a, []);
        byMovie.get(s.movie_a).push({ choice: s.choice });
      }
      let relabeled = 0;
      for (const [id, vs] of byMovie) {
        const winner = categoricalMajority(vs);
        if (winner && winner !== byId.get(id)?.[dim]) {
          if (!calibratedValues.has(id)) { calibratedValues.set(id, {}); votesCount.set(id, {}); postVar.set(id, {}); }
          calibratedValues.get(id)[dim] = winner;
          votesCount.get(id)[dim] = vs.length;
          relabeled++;
        }
      }
      diagnostics.dimensions[dim] = { movies: byMovie.size, relabeled };
      if (byMovie.size) console.log(`  ${dim}: ${byMovie.size} movies voted, ${relabeled} relabeled`);
    }

    // ── write the complete run (every movie, calibrated or prior) ──
    console.log("writing movie_scores_calibrated...");
    let batch = [];
    let written = 0;
    const flush = async () => {
      if (!batch.length) return;
      const { error } = await supabase.from("movie_scores_calibrated").insert(batch);
      if (error) throw new Error(error.message);
      written += batch.length;
      batch = [];
    };
    for (const m of movies) {
      const cal = calibratedValues.get(m.tmdb_id) || {};
      batch.push({
        run_id: runId,
        movie_id: m.tmdb_id,
        valence: cal.valence ?? m.valence,
        arousal: cal.arousal ?? m.arousal,
        dominance: cal.dominance ?? m.dominance,
        absorption: cal.absorption ?? m.absorption,
        hedonic: cal.hedonic ?? m.hedonic,
        eudaimonic: cal.eudaimonic ?? m.eudaimonic,
        psych_rich: cal.psych_rich ?? m.psych_rich,
        emotional_arc: cal.emotional_arc ?? m.emotional_arc,
        dominant_emotions: m.dominant_emotions,
        mood_tags: m.mood_tags,
        watch_context: m.watch_context,
        vibe_sentence: m.vibe_sentence,
        pacing: cal.pacing ?? m.pacing,
        ending_type: cal.ending_type ?? m.ending_type,
        comfort_level: cal.comfort_level ?? m.comfort_level,
        safety_warnings: m.safety_warnings,
        conversation_potential: cal.conversation_potential ?? m.conversation_potential,
        n_votes: votesCount.get(m.tmdb_id) || {},
        posterior_var: postVar.get(m.tmdb_id) || {},
      });
      if (batch.length >= 500) await flush();
    }
    await flush();
    console.log(`wrote ${written} calibrated rows`);

    const { error: doneErr } = await supabase.from("calibration_runs")
      .update({ status: "completed", finished_at: new Date().toISOString(), diagnostics })
      .eq("run_id", runId);
    if (doneErr) throw new Error(doneErr.message);
    console.log(`run ${runId} completed (NOT promoted — promotion is a separate gated step)`);
  } catch (e) {
    await fail(e.message);
  }
} else if (cmd === "promote") {
  if (!arg) { console.error("usage: aggregate.mjs promote <runId>"); process.exit(1); }
  const { data, error } = await supabase.rpc("promote_calibration_run", { p_run_id: arg });
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`promotion: ${data}`);
  if (data !== "promoted") process.exit(1);
} else {
  console.error("usage: aggregate.mjs run | promote <runId>");
  process.exit(1);
}
