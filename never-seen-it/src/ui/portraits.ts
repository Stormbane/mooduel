// Pixel portrait kit: deterministic 32x32 faces from a seed. Used for
// profile cards, seat cards, and the persona portraits.

import { hashSeed, int, mulberry32 } from "../core/rng";

const SKIN = ["#e8c39e", "#c68642", "#8d5524", "#f1d3b3", "#a86a3d"];
const HAIR = ["#1d1a15", "#4a3728", "#8a6b3f", "#b5651d", "#3d3d5c", "#6e2f4f", "#2e7d5b"];
const SHIRT = ["#2e7d5b", "#4a6db5", "#8a2f4f", "#93842a", "#5f2a84", "#1f6f8b"];
const BG = ["#141c30", "#1a1430", "#0c1f1a", "#241203"];

const cache = new Map<number, string>();

export function portraitDataUrl(seed: number): string {
  const hit = cache.get(seed);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d")!;
  const rng = mulberry32(hashSeed("portrait", seed));

  g.fillStyle = BG[int(rng, 0, BG.length - 1)];
  g.fillRect(0, 0, 32, 32);

  const skin = SKIN[int(rng, 0, SKIN.length - 1)];
  const hair = HAIR[int(rng, 0, HAIR.length - 1)];
  const shirt = SHIRT[int(rng, 0, SHIRT.length - 1)];

  // Bucket special case: seed 37 is an actual bucket with googly eyes.
  if (seed === 37) {
    g.fillStyle = "#8b93a5";
    g.fillRect(8, 12, 16, 14);
    g.fillRect(6, 10, 20, 3);
    g.fillStyle = "#fff";
    g.fillRect(11, 16, 4, 4);
    g.fillRect(18, 16, 4, 4);
    g.fillStyle = "#000";
    g.fillRect(12, 18, 2, 2);
    g.fillRect(19, 17, 2, 2);
    g.fillStyle = "#e0b06a"; // lanyard
    g.fillRect(15, 26, 3, 6);
    const url = c.toDataURL();
    cache.set(seed, url);
    return url;
  }

  // shirt
  g.fillStyle = shirt;
  g.fillRect(6, 24, 20, 8);
  // head
  g.fillStyle = skin;
  g.fillRect(9, 8, 14, 15);
  // hair: several styles
  g.fillStyle = hair;
  const style = int(rng, 0, 4);
  if (style === 0) g.fillRect(8, 5, 16, 6);
  else if (style === 1) { g.fillRect(8, 5, 16, 4); g.fillRect(7, 8, 4, 10); }
  else if (style === 2) { g.fillRect(8, 4, 16, 7); g.fillRect(22, 8, 3, 8); }
  else if (style === 3) g.fillRect(10, 6, 12, 3);
  // style 4: no hair
  // eyes
  g.fillStyle = "#0d1120";
  g.fillRect(12, 14, 2, 3);
  g.fillRect(19, 14, 2, 3);
  // glasses sometimes
  if (int(rng, 0, 2) === 0) {
    g.fillStyle = "rgba(13,17,32,0.7)";
    g.fillRect(10, 13, 5, 5);
    g.fillRect(17, 13, 5, 5);
    g.fillRect(15, 15, 2, 1);
  }
  // mouth
  g.fillStyle = "#7a4a3a";
  g.fillRect(14, 20, int(rng, 3, 5), 1);

  const url = c.toDataURL();
  cache.set(seed, url);
  return url;
}

/** The selectable kit for the profile gate: 12 seeds. */
export const PORTRAIT_KIT: number[] = [3, 7, 11, 17, 23, 29, 41, 53, 67, 79, 97, 113];
