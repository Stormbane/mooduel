/**
 * bt.mjs — pure math for the calibration engine (no I/O, unit-testable).
 *
 * Regularized Bayesian Bradley-Terry (MAP with Gaussian prior), diagonal
 * Hessian posterior variance, anchored isotonic or moment-matched affine
 * scale mapping, and precision-based shrinkage blending with the LLM prior.
 */

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

/**
 * Fit Bradley-Terry strengths by MAP estimation.
 * votes: [{winner, loser}] using arbitrary ids.
 * Returns { theta: Map(id -> strength), precision: Map(id -> vote information),
 *           components: number, ids: string[] }
 * The Gaussian prior (lambda) keeps sparse/disconnected graphs identifiable:
 * unconnected movies simply shrink to theta = 0.
 */
export function fitBradleyTerry(votes, { lambda = 1.0, iterations = 200, tol = 1e-6 } = {}) {
  const ids = [...new Set(votes.flatMap((v) => [v.winner, v.loser]))];
  const idx = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const theta = new Float64Array(n);

  for (let it = 0; it < iterations; it++) {
    const grad = new Float64Array(n);
    const hess = new Float64Array(n).fill(lambda);
    for (const v of votes) {
      const w = idx.get(v.winner), l = idx.get(v.loser);
      const p = sigmoid(theta[w] - theta[l]); // P(observed winner wins)
      grad[w] += 1 - p;
      grad[l] -= 1 - p;
      const h = Math.max(p * (1 - p), 1e-6);
      hess[w] += h;
      hess[l] += h;
    }
    for (let i = 0; i < n; i++) grad[i] -= lambda * theta[i];
    let maxStep = 0;
    for (let i = 0; i < n; i++) {
      const step = grad[i] / hess[i];
      theta[i] += step;
      maxStep = Math.max(maxStep, Math.abs(step));
    }
    if (maxStep < tol) break;
  }

  // posterior precision from votes only (informativeness beyond the prior)
  const precision = new Float64Array(n);
  for (const v of votes) {
    const w = idx.get(v.winner), l = idx.get(v.loser);
    const p = sigmoid(theta[w] - theta[l]);
    const h = Math.max(p * (1 - p), 1e-6);
    precision[w] += h;
    precision[l] += h;
  }

  return {
    ids,
    theta: new Map(ids.map((id) => [id, theta[idx.get(id)]])),
    precision: new Map(ids.map((id) => [id, precision[idx.get(id)]])),
    components: countComponents(ids, votes),
  };
}

/** Union-find comparison-graph component count (diagnostic). */
export function countComponents(ids, votes) {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  };
  for (const v of votes) parent.set(find(v.winner), find(v.loser));
  return new Set(ids.map(find)).size;
}

/**
 * Pool-Adjacent-Violators isotonic regression.
 * points: [{x, y}] -> monotone step function; returns an interpolator.
 */
export function isotonicFit(points) {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const blocks = sorted.map((p) => ({ x: p.x, sum: p.y, n: 1 }));
  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i].sum / blocks[i].n > blocks[i + 1].sum / blocks[i + 1].n) {
      blocks[i].sum += blocks[i + 1].sum;
      blocks[i].n += blocks[i + 1].n;
      blocks.splice(i + 1, 1);
      if (i > 0) i--;
    } else i++;
  }
  const xs = blocks.map((b) => b.x);
  const ys = blocks.map((b) => b.sum / b.n);
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let lo = 0;
    while (lo < xs.length - 1 && xs[lo + 1] < x) lo++;
    const t = (x - xs[lo]) / (xs[lo + 1] - xs[lo] || 1);
    return ys[lo] + t * (ys[lo + 1] - ys[lo]);
  };
}

/**
 * Map BT strengths onto the dimension's absolute scale.
 * With anchors ({id -> trueValue}, >= 5 needed): isotonic regression of
 * anchor value on theta — monotone, no forced marginal.
 * Without anchors: moment-matched affine to the LLM prior across voted
 * movies — preserves the prior's location/spread, only reorders.
 */
export function mapToScale(theta, priorValues, anchors, bounds) {
  const ids = [...theta.keys()];
  const anchorPts = ids
    .filter((id) => anchors?.has(id))
    .map((id) => ({ x: theta.get(id), y: anchors.get(id) }));

  let f;
  let method;
  if (anchorPts.length >= 5) {
    f = isotonicFit(anchorPts);
    method = `isotonic(${anchorPts.length} anchors)`;
  } else {
    const ts = ids.map((id) => theta.get(id));
    const ps = ids.map((id) => priorValues.get(id));
    const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    const std = (a, m) => Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length) || 1;
    const mt = mean(ts), st = std(ts, mt);
    const mp = mean(ps), sp = std(ps, mp);
    f = (x) => mp + ((x - mt) / st) * sp;
    method = "affine-moment-match(no anchors)";
  }
  const [lo, hi] = bounds;
  const clamp = (x) => Math.min(hi, Math.max(lo, x));
  return { map: (id) => clamp(f(theta.get(id))), method };
}

/**
 * Precision-based shrinkage blend with the LLM prior.
 * calibrated = w*human + (1-w)*prior, w = precision/(precision + k).
 * Zero votes -> w = 0 -> the prior stands untouched.
 */
export function blend(humanValue, priorValue, precision, { k = 10 } = {}) {
  const w = precision / (precision + k);
  return w * humanValue + (1 - w) * priorValue;
}

/**
 * Categorical relabel by (optionally weighted) majority.
 * votes: [{choice, weight?}]. Needs minN votes and margin (top share).
 */
export function categoricalMajority(votes, { minN = 5, margin = 0.6 } = {}) {
  if (votes.length < minN) return null;
  const tally = new Map();
  let total = 0;
  for (const v of votes) {
    const w = v.weight ?? 1;
    tally.set(v.choice, (tally.get(v.choice) || 0) + w);
    total += w;
  }
  const [top, count] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  return count / total >= margin ? top : null;
}
