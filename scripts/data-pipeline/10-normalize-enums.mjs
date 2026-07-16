#!/usr/bin/env node
/**
 * 10-normalize-enums.mjs — Phase 1a of the calibration replatform.
 *
 * Scans the canonical classifier output (data/movie-mood-scores.jsonl) for
 * out-of-schema enum values and produces a PATCH LEDGER — it never mutates
 * the source file. Two outputs under data/patches/:
 *
 *   patches-mechanical-<runId>.jsonl   one row per field change:
 *     { tmdbId, field, old, new, method, rule, runId }
 *     (new === null means "remove this value")
 *
 *   llm-reclassify-needed-<runId>.jsonl   rows whose arc/ending/pacing can't
 *     be mapped mechanically and need a targeted LLM re-classification:
 *     { tmdbId, field, invalidValue }
 *
 *   maps-<runId>.json   the exact materialized value→target maps used, so
 *     the run is reviewable and reproducible from the ledger alone.
 *
 * Apply happens later (script 11) after the LLM batch returns, so canonical
 * data and Supabase are patched together from one validated ledger.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "data/movie-mood-scores.jsonl");
const OUT_DIR = path.join(ROOT, "data/patches");

const ARCS = ["rags-to-riches", "riches-to-rags", "man-in-a-hole", "icarus", "cinderella", "oedipus"];
const PACING = ["slow-burn", "building", "steady", "relentless", "episodic"];
const ENDINGS = ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"];
const WARNINGS = ["sudden-grief", "sexual-assault", "self-harm", "child-harm", "animal-harm", "suicide", "graphic-violence", "domestic-abuse", "psychological-manipulation"];
const EMOTIONS = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"];

// ── Mechanical maps for the three single-value enums ──
// Only unambiguous repairs live here; everything else invalid goes to the
// LLM re-classification batch.
const ARC_MAP = {
  "man-in-the-hole": "man-in-a-hole", // typo
};
const ENDING_MAP = {
  tragic: "devastating",
  cliffhanger: "ambiguous",
  "gut-punch": "devastating",
  "pyrrhic-victory": "bittersweet",
};
const PACING_MAP = {}; // "uneven" has no honest mechanical target → LLM

// ── Safety warnings: curated head map ──
// Values map to the nearest published enum, or null to drop. The bar for
// mapping: a viewer warned with the target would not be blindsided by the
// source content. When no target clears that bar, we drop rather than
// mislabel (logged, and revisitable in a future schema version).
const WARNING_HEAD = {
  "body-horror": "graphic-violence",
  torture: "graphic-violence",
  murder: "graphic-violence",
  "sudden-violence": "graphic-violence",
  violence: "graphic-violence",
  cannibalism: "graphic-violence",
  "police-brutality": "graphic-violence",
  "racial-violence": "graphic-violence",
  "school-shooting": "graphic-violence",
  genocide: "graphic-violence",
  execution: "graphic-violence",
  "political-violence": "graphic-violence",
  "attempted-murder": "graphic-violence",
  "war-crimes": "graphic-violence",
  gore: "graphic-violence",
  "child-abuse": "child-harm",
  "child-death": "child-harm",
  "child-endangerment": "child-harm",
  "child-sexual-abuse": "child-harm",
  "childhood-sexual-abuse": "child-harm",
  "child-neglect": "child-harm",
  "child-abandonment": "child-harm",
  "child-abduction": "child-harm",
  "child-exploitation": "child-harm",
  "child-pornography": "child-harm",
  infanticide: "child-harm",
  "sexual-coercion": "sexual-assault",
  rape: "sexual-assault",
  "attempted-rape": "sexual-assault",
  "sexual-abuse": "sexual-assault",
  "sexual-exploitation": "sexual-assault",
  "sexual-manipulation": "sexual-assault",
  "statutory-rape": "sexual-assault",
  "marital-rape": "sexual-assault",
  "gang-rape": "sexual-assault",
  grooming: "sexual-assault",
  "sex-trafficking": "sexual-assault",
  "forced-prostitution": "sexual-assault",
  "sexual-harassment": "sexual-assault",
  "sudden-death": "sudden-grief",
  "accidental-death": "sudden-grief",
  grief: "sudden-grief",
  "parental-death": "sudden-grief",
  miscarriage: "sudden-grief",
  stillbirth: "sudden-grief",
  "terminal-illness": "sudden-grief",
  "suicide-ideation": "suicide",
  "suicide-attempt": "suicide",
  "suicidal-ideation": "suicide",
  "suicide attempt": "suicide",
  "teen-suicide": "suicide",
  "mass-suicide": "suicide",
  "assisted-suicide": "suicide",
  euthanasia: "suicide",
  "murder-suicide": "suicide",
  "forced-suicide": "suicide",
  "self-mutilation": "self-harm",
  "self-destruction": "self-harm",
  "eating-disorder": "self-harm",
  "domestic-violence": "domestic-abuse",
  "emotional-abuse": "domestic-abuse",
  "physical-abuse": "domestic-abuse",
  "abusive-relationship": "domestic-abuse",
  "abusive-father": "domestic-abuse",
  "family-abuse": "domestic-abuse",
  "family-violence": "domestic-abuse",
  "elder-abuse": "domestic-abuse",
  gaslighting: "psychological-manipulation",
  manipulation: "psychological-manipulation",
  "emotional-manipulation": "psychological-manipulation",
  blackmail: "psychological-manipulation",
  stalking: "psychological-manipulation",
  bullying: "psychological-manipulation",
  cyberbullying: "psychological-manipulation",
  "mind-control": "psychological-manipulation",
  "coercive-control": "psychological-manipulation",
  "cult-manipulation": "psychological-manipulation",
  "psychological-abuse": "psychological-manipulation",
  "animal-death": "animal-harm",
  "animal-cruelty": "animal-harm",
  bestiality: "animal-harm",
  // frequent values with no honest target → drop
  incest: null,
  "sexual-content": null,
  kidnapping: null,
  "drug-use": null,
  "drug-abuse": null,
  "substance-abuse": null,
  addiction: null,
  alcoholism: null,
  "drug-addiction": null,
  infidelity: null,
  racism: null,
  "human-trafficking": null,
  necrophilia: null,
  exploitation: null,
  "mental-health-crisis": null,
  "mental-illness": null,
  homophobia: null,
  "teenage-pregnancy": null,
  "age-gap-relationship": null,
};

// Ordered fallback rules for the warning long tail (first match wins).
// Each rule: [regex, target|null]
const WARNING_RULES = [
  [/suicid/i, "suicide"],
  [/self-harm|self-mutilat|self-destruct/i, "self-harm"],
  [/(child|infant|minor|filicide|matricide|fetal|teen).*(abuse|harm|death|peril|danger|jeopard|endanger|loss|molest|exploit|traffick|pornography|distress|drowning|welfare|labor|marriage|imprison)|infanticide/i, "child-harm"],
  [/rape|sexual.?(assault|abuse|coercion|exploit|predat|sadism|violence|trauma)|molest|grooming|statutory|date-rape|forced-(impregnation|pregnancy|marriage)|pedophil|sex.?(slavery|trafficking)/i, "sexual-assault"],
  [/animal|bestiality/i, "animal-harm"],
  [/domestic|marital-collapse|spousal|abusive-(parent|relationship|father|mother)/i, "domestic-abuse"],
  [/gaslight|manipulat|coerci|brainwash|mind-control|cult-(trauma|harm|violence)|stalk|harass|blackmail|bully/i, "psychological-manipulation"],
  [/murder|massacre|genocide|lynch|behead|decapitat|dismember|mutilat|torture|gore|violence|violent|shooting|stabbing|whipping|crucifix|cannibal|snuff|atrocit|brutal|execution|assassinat|killing|slaughter|war-crime|combat-death|terroris/i, "graphic-violence"],
  [/death|grief|loss(-|$)|bereave|miscarriage|stillbirth|terminal|fatal|drowning|overdose|dying/i, "sudden-grief"],
];

// ── Emotions: map to Plutchik's eight, or null to drop ──
// Plutchik dyad decompositions guide the head map (hope = anticipation+trust
// → anticipation; awe = fear+surprise → surprise; love = joy+trust → joy...).
const EMOTION_HEAD = {
  hope: "anticipation", determination: "anticipation", ambition: "anticipation",
  curiosity: "anticipation", suspense: "anticipation", intrigue: "anticipation",
  urgency: "anticipation", excitement: "anticipation", desire: "anticipation",
  temptation: "anticipation", resolve: "anticipation", interest: "anticipation",
  amusement: "joy", triumph: "joy", pride: "joy", satisfaction: "joy",
  relief: "joy", exhilaration: "joy", love: "joy", warmth: "joy",
  inspiration: "joy", humor: "joy", whimsy: "joy", pleasure: "joy",
  passion: "joy", catharsis: "joy", contentment: "joy", peace: "joy",
  vindication: "joy", mischief: "joy", thrill: "joy", liberation: "joy",
  gratitude: "joy", freedom: "joy", empowerment: "joy",
  compassion: "trust", tenderness: "trust", empathy: "trust", sympathy: "trust",
  admiration: "trust", affection: "trust", camaraderie: "trust", respect: "trust",
  acceptance: "trust", faith: "trust", reverence: "trust", loyalty: "trust",
  comfort: "trust", reconciliation: "trust", understanding: "trust",
  dread: "fear", anxiety: "fear", paranoia: "fear", unease: "fear",
  tension: "fear", terror: "fear", panic: "fear", stress: "fear",
  helplessness: "fear", desperation: "fear", vulnerability: "fear",
  suspicion: "fear", distrust: "fear", doubt: "fear", uncertainty: "fear",
  danger: "fear", horror: "fear", angst: "fear",
  nostalgia: "sadness", melancholy: "sadness", melancholia: "sadness",
  despair: "sadness", longing: "sadness", yearning: "sadness", grief: "sadness",
  guilt: "sadness", shame: "sadness", regret: "sadness", remorse: "sadness",
  disappointment: "sadness", loneliness: "sadness", heartbreak: "sadness",
  resignation: "sadness", disillusionment: "sadness", wistfulness: "sadness",
  anguish: "sadness", pity: "sadness", isolation: "sadness", loss: "sadness",
  hopelessness: "sadness", alienation: "sadness", embarrassment: "sadness",
  awkwardness: "sadness", humiliation: "sadness", pathos: "sadness",
  poignancy: "sadness", tragedy: "sadness", devastation: "sadness", pain: "sadness",
  frustration: "anger", betrayal: "anger", jealousy: "anger", envy: "anger",
  resentment: "anger", indignation: "anger", rage: "anger", defiance: "anger",
  injustice: "anger", exasperation: "anger", irritation: "anger",
  annoyance: "anger", revenge: "anger", aggression: "anger",
  contempt: "disgust", cynicism: "disgust", lust: "disgust",
  confusion: "surprise", wonder: "surprise", awe: "surprise", shock: "surprise",
  fascination: "surprise", bewilderment: "surprise", disbelief: "surprise",
  bemusement: "surprise", disorientation: "surprise", mystery: "surprise",
  realization: "surprise", revelation: "surprise", absurdity: "surprise",
};
const EMOTION_RULES = [
  [/amusement|humor|comic|joy|funny/i, "joy"],       // dark-amusement, darkHumor…
  [/bittersweet/i, "sadness"],                        // bittersweet-* compounds
  [/dread|anxi|fear|unsettl/i, "fear"],
  [/anger|outrage|fury|indign/i, "anger"],
  [/melanchol|sad|sorrow|mourn/i, "sadness"],
  [/trust/i, "trust"],
];

// ── run ──
const runId = `normalize-${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(3).toString("hex")}`;
fs.mkdirSync(OUT_DIR, { recursive: true });

const mapValue = (value, head, rules) => {
  if (value in head) return { target: head[value], rule: "head" };
  for (const [re, target] of rules) if (re.test(value)) return { target, rule: `rule:${re.source.slice(0, 24)}` };
  return { target: null, rule: "fallback-drop" };
};

const patches = [];
const llmNeeded = [];
let rows = 0;
const stats = { arc: 0, pacing: 0, ending: 0, warnMapped: 0, warnDropped: 0, emoMapped: 0, emoDropped: 0, emoBelow2: 0 };

const rl = readline.createInterface({ input: fs.createReadStream(SRC) });
for await (const line of rl) {
  const m = JSON.parse(line);
  rows++;

  // single-value enums: mechanical map or LLM queue
  for (const [field, valid, map] of [
    ["emotionalArc", ARCS, ARC_MAP],
    ["pacing", PACING, PACING_MAP],
    ["endingType", ENDINGS, ENDING_MAP],
  ]) {
    const v = m[field];
    if (valid.includes(v)) continue;
    if (v in map) {
      patches.push({ tmdbId: m.tmdbId, field, old: v, new: map[v], method: "mechanical-map", rule: "head", runId });
      stats[field === "emotionalArc" ? "arc" : field === "pacing" ? "pacing" : "ending"]++;
    } else {
      llmNeeded.push({ tmdbId: m.tmdbId, field, invalidValue: v });
    }
  }

  // warnings: map/drop with dedupe
  const warnIn = m.emotionalSafetyWarnings || [];
  if (warnIn.some((w) => !WARNINGS.includes(w))) {
    const out = [];
    for (const w of warnIn) {
      if (WARNINGS.includes(w)) { if (!out.includes(w)) out.push(w); continue; }
      const { target, rule } = mapValue(w, WARNING_HEAD, WARNING_RULES);
      patches.push({ tmdbId: m.tmdbId, field: "emotionalSafetyWarnings", old: w, new: target, method: "curated-map", rule, runId });
      if (target) { stats.warnMapped++; if (!out.includes(target)) out.push(target); }
      else stats.warnDropped++;
    }
  }

  // emotions: map/drop with dedupe; log rows left under the schema minimum
  const emoIn = m.dominantEmotions || [];
  if (emoIn.some((e) => !EMOTIONS.includes(e))) {
    const out = [];
    for (const e of emoIn) {
      if (EMOTIONS.includes(e)) { if (!out.includes(e)) out.push(e); continue; }
      const { target, rule } = mapValue(e, EMOTION_HEAD, EMOTION_RULES);
      patches.push({ tmdbId: m.tmdbId, field: "dominantEmotions", old: e, new: target, method: "curated-map", rule, runId });
      if (target) { stats.emoMapped++; if (!out.includes(target)) out.push(target); }
      else stats.emoDropped++;
    }
    if (out.length < 2) stats.emoBelow2++;
  }
}

const write = (name, rowsArr) =>
  fs.writeFileSync(path.join(OUT_DIR, name), rowsArr.map((r) => JSON.stringify(r)).join("\n") + "\n");

write(`patches-mechanical-${runId}.jsonl`, patches);
write(`llm-reclassify-needed-${runId}.jsonl`, llmNeeded);
fs.writeFileSync(
  path.join(OUT_DIR, `maps-${runId}.json`),
  JSON.stringify({ runId, ARC_MAP, ENDING_MAP, PACING_MAP, WARNING_HEAD, WARNING_RULES: WARNING_RULES.map(([re, t]) => [re.source, t]), EMOTION_HEAD, EMOTION_RULES: EMOTION_RULES.map(([re, t]) => [re.source, t]) }, null, 2),
);

console.log(`runId: ${runId}`);
console.log(`rows scanned: ${rows}`);
console.log(`mechanical patches: ${patches.length}`);
console.log(`  arc:${stats.arc} pacing:${stats.pacing} ending:${stats.ending}`);
console.log(`  warnings mapped:${stats.warnMapped} dropped:${stats.warnDropped}`);
console.log(`  emotions mapped:${stats.emoMapped} dropped:${stats.emoDropped} (rows left <2 emotions: ${stats.emoBelow2})`);
console.log(`LLM re-classification needed: ${llmNeeded.length}`);
const byField = {};
for (const r of llmNeeded) byField[r.field] = (byField[r.field] || 0) + 1;
console.log(`  by field:`, byField);
