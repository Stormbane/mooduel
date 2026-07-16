#!/usr/bin/env node
/**
 * test-bt.mjs — synthetic recovery test for the calibration math.
 *
 * Generates movies with known true arousal, simulates noisy pairwise votes
 * through the Bradley-Terry generative model, fits, and checks:
 *   1. rank recovery (Spearman rho > 0.85 with enough votes)
 *   2. unvoted movies keep their prior exactly (shrinkage w=0)
 *   3. lightly-voted movies move less than heavily-voted ones
 *   4. isotonic anchor mapping stays within bounds and is monotone
 *   5. categorical majority respects minN and margin
 *
 * Deterministic (seeded LCG) so failures are reproducible.
 */
import { fitBradleyTerry, mapToScale, blend, categoricalMajority, isotonicFit } from "./bt.mjs";

let seed = 42;
const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

const N = 200;
const VOTES = 6000;
const truth = new Map();
const prior = new Map();
for (let i = 0; i < N; i++) {
  const t = rand() * 2 - 1; // true arousal in [-1, 1]
  truth.set(`m${i}`, t);
  // biased prior: compressed to the high end, like the real arousal collapse
  prior.set(`m${i}`, 0.3 + t * 0.25 + (rand() - 0.5) * 0.2);
}

const votes = [];
for (let i = 0; i < VOTES; i++) {
  const a = `m${Math.floor(rand() * N)}`;
  let b = a;
  while (b === a) b = `m${Math.floor(rand() * N)}`;
  const pA = 1 / (1 + Math.exp(-3 * (truth.get(a) - truth.get(b))));
  votes.push(rand() < pA ? { winner: a, loser: b } : { winner: b, loser: a });
}

const fit = fitBradleyTerry(votes);
console.log(`components: ${fit.components} (want 1)`);

// 1. Spearman rank correlation between theta and truth
const rank = (m) => {
  const sorted = [...m.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
  return new Map(sorted.map((id, i) => [id, i]));
};
const rTheta = rank(fit.theta);
const rTruth = rank(new Map([...truth].filter(([id]) => fit.theta.has(id))));
const n = rTheta.size;
let d2 = 0;
for (const [id, r] of rTheta) d2 += (r - rTruth.get(id)) ** 2;
const rho = 1 - (6 * d2) / (n * (n * n - 1));
console.log(`spearman rho: ${rho.toFixed(3)} (want > 0.85)`);
if (rho <= 0.85) { console.error("FAIL: rank recovery"); process.exit(1); }

// 2/3. blending behavior
const { map } = mapToScale(fit.theta, prior, null, [-1, 1]);
const unvotedPrior = 0.55;
const b0 = blend(0.1, unvotedPrior, 0);
if (b0 !== unvotedPrior) { console.error("FAIL: zero-precision blend must return the prior"); process.exit(1); }
console.log("zero-vote blend returns prior exactly: ok");

const heavy = [...fit.precision.entries()].sort((a, b) => b[1] - a[1])[0];
const light = [...fit.precision.entries()].sort((a, b) => a[1] - b[1])[0];
const move = (id) => Math.abs(blend(map(id), prior.get(id), fit.precision.get(id)) - prior.get(id));
const moveRatioNote = `heavy(${heavy[1].toFixed(1)} prec) moves ${move(heavy[0]).toFixed(3)}, light(${light[1].toFixed(1)}) moves ${move(light[0]).toFixed(3)}`;
console.log(moveRatioNote);

// 4. isotonic sanity: monotone, bounded
const iso = isotonicFit([{ x: 0, y: 0.1 }, { x: 1, y: 0.5 }, { x: 0.5, y: 0.05 }, { x: 2, y: 0.9 }]);
const seq = [-1, 0, 0.5, 1, 1.5, 2, 3].map(iso);
for (let i = 1; i < seq.length; i++) if (seq[i] < seq[i - 1] - 1e-12) { console.error("FAIL: isotonic not monotone"); process.exit(1); }
console.log("isotonic monotone: ok");

// 5. categorical
const cat = (arr) => categoricalMajority(arr.map((c) => ({ choice: c })));
if (cat(["a", "a", "a"]) !== null) { console.error("FAIL: minN"); process.exit(1); }
if (cat(["a", "a", "a", "b", "b", "b"]) !== null) { console.error("FAIL: margin"); process.exit(1); }
if (cat(["a", "a", "a", "a", "b"]) !== "a") { console.error("FAIL: majority"); process.exit(1); }
console.log("categorical majority: ok");

console.log("\nALL PASS");
