// Procedural pixel posters (spec §11.4). Deterministic from tmdb_id:
// 96x144, palette-constrained, layered kit, wear marks. Also the
// production fallback for movies with missing posters.

import { mulberry32, hashSeed, pick, int, type Rng } from "../core/rng";

export const POSTER_W = 96;
export const POSTER_H = 144;

// Slices of the global 32-color palette (§11.1): night blues, phosphor
// greens, dusty ambers, one magenta reserved elsewhere for UI.
const SKY_RAMPS: [string, string][] = [
  ["#0a0e1a", "#1d2b53"], ["#1d2b53", "#4a6db5"], ["#12082a", "#5f2a84"],
  ["#0c1f1a", "#2e7d5b"], ["#241203", "#a85f2a"], ["#1a0a12", "#8a2f4f"],
  ["#03181f", "#1f6f8b"], ["#20180a", "#93842a"],
];
const INK = ["#05070d", "#0d1120", "#141a2e"];
const ACCENTS = ["#e8d5a0", "#c9e4b4", "#9fd8df", "#d8a0c9", "#e0b06a", "#b4c9e4"];

const cache = new Map<number, HTMLCanvasElement>();

export function posterCanvas(tmdbId: number, title: string, year: number): HTMLCanvasElement {
  const hit = cache.get(tmdbId);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = POSTER_W;
  c.height = POSTER_H;
  drawPoster(c.getContext("2d")!, mulberry32(hashSeed("poster", tmdbId)), title, year);
  cache.set(tmdbId, c);
  return c;
}

export function posterDataUrl(tmdbId: number, title: string, year: number): string {
  return posterCanvas(tmdbId, title, year).toDataURL();
}

function drawPoster(g: CanvasRenderingContext2D, rng: Rng, title: string, year: number) {
  g.imageSmoothingEnabled = false;
  const [lo, hi] = pick(rng, SKY_RAMPS);
  const ink = pick(rng, INK);
  const accent = pick(rng, ACCENTS);

  // Gradient sky, banded (dither-era: 6 hard bands, no smooth gradient).
  const bands = 6;
  for (let b = 0; b < bands; b++) {
    g.fillStyle = mix(lo, hi, b / (bands - 1));
    g.fillRect(0, Math.floor((b * POSTER_H) / bands), POSTER_W, Math.ceil(POSTER_H / bands) + 1);
  }

  // Geometric motif behind the figure.
  const motif = int(rng, 0, 3);
  g.fillStyle = accent;
  if (motif === 0) {
    // sun / moon disc
    disc(g, int(rng, 24, 72), int(rng, 24, 56), int(rng, 10, 20));
  } else if (motif === 1) {
    // diagonal beams
    g.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
      const x = int(rng, -20, 80);
      beam(g, x, 0, x + 40, POSTER_H, 6);
    }
    g.globalAlpha = 1;
  } else if (motif === 2) {
    // concentric rings
    const cx = int(rng, 30, 66), cy = int(rng, 30, 60);
    for (let r = 24; r > 4; r -= 8) ring(g, cx, cy, r, 2);
  } else {
    // horizon bars
    for (let i = 0; i < 4; i++) g.fillRect(0, 60 + i * 6, POSTER_W, 2);
  }

  // Silhouette figure kit.
  g.fillStyle = ink;
  const fig = int(rng, 0, 4);
  const baseY = POSTER_H - 36;
  if (fig === 0) figureStanding(g, int(rng, 24, 64), baseY, rng);
  else if (fig === 1) figurePair(g, int(rng, 20, 52), baseY, rng);
  else if (fig === 2) skyline(g, baseY, rng);
  else if (fig === 3) mountain(g, baseY, rng);
  else lonesomeCar(g, int(rng, 12, 48), baseY, rng);

  // Ground.
  g.fillStyle = ink;
  g.fillRect(0, POSTER_H - 34, POSTER_W, 34);

  // Title block: one of 4 pixel display treatments.
  const font = int(rng, 0, 3);
  drawTitle(g, title.toUpperCase(), year, font, accent);

  // Grain + wear marks.
  g.globalAlpha = 0.12;
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rng() < 0.5 ? "#000" : "#fff";
    g.fillRect(int(rng, 0, POSTER_W - 1), int(rng, 0, POSTER_H - 1), 1, 1);
  }
  g.globalAlpha = 0.25;
  g.fillStyle = "#fff";
  for (let i = 0; i < int(rng, 1, 3); i++) {
    // vertical scuff line, like a worn sleeve crease
    const x = int(rng, 4, POSTER_W - 4);
    g.fillRect(x, 0, 1, POSTER_H);
  }
  g.globalAlpha = 1;
  // corner wear
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.fillRect(0, 0, 3, 3);
  g.fillRect(POSTER_W - 3, POSTER_H - 3, 3, 3);
}

function drawTitle(
  g: CanvasRenderingContext2D, title: string, year: number, font: number, accent: string,
) {
  const words = title.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 12) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else cur = (cur + " " + w).trim();
    if (lines.length === 2) break;
  }
  if (cur && lines.length < 3) lines.push(cur.trim());

  const fonts = [
    "bold 9px monospace",
    "bold 8px monospace",
    "9px monospace",
    "bold 10px monospace",
  ];
  g.font = fonts[font];
  g.textAlign = "center";
  g.textBaseline = "top";
  let y = POSTER_H - 30;
  g.fillStyle = accent;
  for (const line of lines.slice(0, 2)) {
    const text = line.length > 13 ? line.slice(0, 12) + "." : line;
    if (font === 3) {
      // drop-shadow treatment
      g.fillStyle = "#000";
      g.fillText(text, POSTER_W / 2 + 1, y + 1);
      g.fillStyle = accent;
    }
    g.fillText(text, POSTER_W / 2, y);
    y += font === 1 ? 9 : 11;
  }
  g.font = "7px monospace";
  g.fillStyle = "rgba(255,255,255,0.6)";
  g.fillText(String(year), POSTER_W / 2, POSTER_H - 9);
}

// ---- kit pieces ----

function disc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    g.fillRect(cx - half, cy + y, half * 2, 1);
  }
}

function ring(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, w: number) {
  for (let y = -r; y <= r; y++) {
    const outer = Math.floor(Math.sqrt(r * r - y * y));
    const rIn = Math.max(0, r - w);
    const innerSq = rIn * rIn - y * y;
    const inner = innerSq > 0 ? Math.floor(Math.sqrt(innerSq)) : 0;
    g.fillRect(cx - outer, cy + y, outer - inner, 1);
    g.fillRect(cx + inner, cy + y, outer - inner, 1);
  }
}

function beam(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number) {
  const steps = Math.abs(y1 - y0);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    g.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), w, 1);
  }
}

function figureStanding(g: CanvasRenderingContext2D, x: number, baseY: number, rng: Rng) {
  const h = int(rng, 26, 40);
  g.fillRect(x - 2, baseY - h, 4, h);            // body
  disc(g, x, baseY - h - 3, 4);                   // head
  g.fillRect(x - 6, baseY - h + 6, 12, 2);        // arms
}

function figurePair(g: CanvasRenderingContext2D, x: number, baseY: number, rng: Rng) {
  figureStanding(g, x, baseY, rng);
  figureStanding(g, x + int(rng, 12, 24), baseY, rng);
}

function skyline(g: CanvasRenderingContext2D, baseY: number, rng: Rng) {
  let x = 0;
  while (x < POSTER_W) {
    const w = int(rng, 8, 18);
    const h = int(rng, 14, 48);
    g.fillRect(x, baseY - h, w, h);
    x += w + int(rng, 1, 4);
  }
}

function mountain(g: CanvasRenderingContext2D, baseY: number, rng: Rng) {
  const peaks = int(rng, 2, 3);
  for (let p = 0; p < peaks; p++) {
    const cx = int(rng, 10, POSTER_W - 10);
    const h = int(rng, 24, 52);
    const half = int(rng, 16, 30);
    for (let y = 0; y < h; y++) {
      const w = Math.round((y / h) * half);
      g.fillRect(cx - w, baseY - h + y, w * 2, 1);
    }
  }
}

function lonesomeCar(g: CanvasRenderingContext2D, x: number, baseY: number, rng: Rng) {
  const w = int(rng, 26, 36);
  g.fillRect(x, baseY - 8, w, 6);
  g.fillRect(x + 6, baseY - 12, w - 14, 5);
  disc(g, x + 6, baseY - 1, 3);
  disc(g, x + w - 6, baseY - 1, 3);
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a), pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function hex(s: string): number[] {
  return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
}
