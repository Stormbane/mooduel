#!/usr/bin/env node
/**
 * reclassify-enums.mjs — targeted re-classification of invalid enum fields.
 *
 * Reads data/patches/llm-reclassify-needed-<runId>.jsonl, joins the movie
 * context from data/movie-input-corpus.jsonl, and submits one Batches API
 * request per movie asking ONLY for the invalid field(s), constrained to
 * the published enum vocabulary. Results become ledger patches with full
 * provenance (model, prompt version, raw responses kept on disk).
 *
 * Usage:
 *   node reclassify-enums.mjs submit <runId>     # build + submit batch
 *   node reclassify-enums.mjs fetch  <runId>     # poll, write patches jsonl
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const ROOT = path.resolve(import.meta.dirname, "../..");
const PATCH_DIR = path.join(ROOT, "data/patches");
const RAW_DIR = path.join(PATCH_DIR, "raw");
const MODEL = "claude-haiku-4-5-20251001";
const PROMPT_VERSION = "reclassify-enums-v1";

// load .env.local
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("ANTHROPIC_API_KEY missing"); process.exit(1); }

const ENUMS = {
  emotionalArc: {
    values: ["rags-to-riches", "riches-to-rags", "man-in-a-hole", "icarus", "cinderella", "oedipus"],
    description: `The film's emotional trajectory (Reagan et al.'s six story shapes):
- rags-to-riches: steady emotional rise
- riches-to-rags: steady emotional fall
- man-in-a-hole: fall then rise (protagonist gets into trouble, gets out)
- icarus: rise then fall
- cinderella: rise, fall, rise
- oedipus: fall, rise, fall`,
  },
  endingType: {
    values: ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"],
    description: "How the film resolves emotionally for the viewer.",
  },
  pacing: {
    values: ["slow-burn", "building", "steady", "relentless", "episodic"],
    description: "The rhythm of the viewing experience.",
  },
};

const [, , cmd, runId] = process.argv;
if (!cmd || !runId) { console.error("usage: reclassify-enums.mjs submit|fetch <runId>"); process.exit(1); }
const NEED_FILE = path.join(PATCH_DIR, `llm-reclassify-needed-${runId}.jsonl`);
const BATCH_META = path.join(PATCH_DIR, `reclassify-batch-${runId}.json`);

const api = async (route, opts = {}) => {
  const res = await fetch(`https://api.anthropic.com/v1/${route}`, {
    ...opts,
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      ...opts.headers,
    },
  });
  if (!res.ok) throw new Error(`${route}: ${res.status} ${await res.text()}`);
  return res;
};

if (cmd === "submit") {
  const need = fs.readFileSync(NEED_FILE, "utf8").trim().split("\n").map(JSON.parse);
  const byMovie = new Map();
  for (const r of need) {
    if (!byMovie.has(r.tmdbId)) byMovie.set(r.tmdbId, []);
    byMovie.get(r.tmdbId).push(r);
  }
  console.log(`${need.length} fields across ${byMovie.size} movies`);

  // stream the corpus, keep only needed movies
  const ctx = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(ROOT, "data/movie-input-corpus.jsonl")) });
  for await (const line of rl) {
    const id = Number(line.match(/"tmdbId":(\d+)/)?.[1]);
    if (byMovie.has(id)) ctx.set(id, JSON.parse(line));
  }
  console.log(`corpus context found for ${ctx.size}/${byMovie.size}`);

  const requests = [];
  for (const [tmdbId, fields] of byMovie) {
    const c = ctx.get(tmdbId);
    if (!c) { console.warn(`no corpus row for ${tmdbId}, skipping`); continue; }
    const fieldSpecs = fields
      .map((f) => `"${f.field}": one of ${JSON.stringify(ENUMS[f.field].values)}\n${ENUMS[f.field].description}`)
      .join("\n\n");
    const parts = [
      `Movie: ${c.title} (${c.year}) — genres: ${(c.genres || []).join(", ")}`,
      c.overview ? `Overview: ${c.overview}` : null,
      c.wikipediaPlot ? `Plot: ${String(c.wikipediaPlot).slice(0, 3000)}` : null,
      (c.reviews || []).length ? `Critic reviews:\n${c.reviews.slice(0, 2).map((r) => `- ${String(r.text || r).slice(0, 400)}`).join("\n")}` : null,
    ].filter(Boolean).join("\n\n");
    requests.push({
      custom_id: `re-${tmdbId}`,
      params: {
        model: MODEL,
        max_tokens: 150,
        system: `You classify movies for a mood dataset. A previous pass produced an out-of-vocabulary value for the field(s) below. Choose the correct value from the allowed list only. Respond with a single JSON object containing exactly the requested field(s), nothing else.`,
        messages: [
          { role: "user", content: `${parts}\n\nRequested field(s):\n${fieldSpecs}` },
          { role: "assistant", content: "{" },
        ],
      },
    });
  }

  const res = await api("messages/batches", { method: "POST", body: JSON.stringify({ requests }) });
  const batch = await res.json();
  fs.writeFileSync(BATCH_META, JSON.stringify({ batchId: batch.id, model: MODEL, promptVersion: PROMPT_VERSION, submitted: new Date().toISOString(), requestCount: requests.length }, null, 2));
  console.log(`submitted batch ${batch.id} (${requests.length} requests)`);
} else if (cmd === "fetch") {
  const meta = JSON.parse(fs.readFileSync(BATCH_META, "utf8"));
  const status = await (await api(`messages/batches/${meta.batchId}`)).json();
  console.log(`batch ${meta.batchId}: ${status.processing_status}`, status.request_counts);
  if (status.processing_status !== "ended") process.exit(2);

  const need = fs.readFileSync(NEED_FILE, "utf8").trim().split("\n").map(JSON.parse);
  const wanted = new Map(); // tmdbId -> {field: invalidValue}
  for (const r of need) {
    if (!wanted.has(r.tmdbId)) wanted.set(r.tmdbId, {});
    wanted.get(r.tmdbId)[r.field] = r.invalidValue;
  }

  fs.mkdirSync(RAW_DIR, { recursive: true });
  const rawPath = path.join(RAW_DIR, `reclassify-results-${runId}.jsonl`);
  const text = await (await api(`messages/batches/${meta.batchId}/results`)).text();
  fs.writeFileSync(rawPath, text);

  const patches = [];
  let ok = 0, bad = 0;
  for (const line of text.trim().split("\n")) {
    const r = JSON.parse(line);
    const tmdbId = Number(r.custom_id.replace("re-", ""));
    const fields = wanted.get(tmdbId);
    if (!fields || r.result?.type !== "succeeded") { bad++; continue; }
    let parsed;
    try {
      parsed = JSON.parse("{" + r.result.message.content.map((c) => c.text || "").join(""));
    } catch { bad++; continue; }
    for (const [field, invalidValue] of Object.entries(fields)) {
      const v = parsed[field];
      if (ENUMS[field].values.includes(v)) {
        patches.push({ tmdbId, field, old: invalidValue, new: v, method: "llm-reclassify", rule: `${MODEL}/${PROMPT_VERSION}`, runId });
        ok++;
      } else bad++;
    }
  }
  const out = path.join(PATCH_DIR, `patches-llm-${runId}.jsonl`);
  fs.writeFileSync(out, patches.map((p) => JSON.stringify(p)).join("\n") + "\n");
  console.log(`patches: ${ok} ok, ${bad} failed/invalid → ${out}`);
  console.log(`raw responses: ${rawPath}`);
}
