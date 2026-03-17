import type { ColorSwatch, EmotionCard, TmdbMovie, TmdbGenre } from "@/lib/types";

// ── Genre → Valence/Arousal map ──

export const GENRE_VA: Record<string, { valence: number; arousal: number }> = {
  Comedy:      { valence: +0.7, arousal: +0.3 },
  Romance:     { valence: +0.5, arousal: +0.2 },
  Animation:   { valence: +0.5, arousal: +0.3 },
  Family:      { valence: +0.6, arousal: +0.1 },
  Adventure:   { valence: +0.3, arousal: +0.6 },
  Fantasy:     { valence: +0.2, arousal: +0.4 },
  Action:      { valence: +0.1, arousal: +0.8 },
  Music:       { valence: +0.4, arousal: +0.4 },
  "Science Fiction": { valence: 0.0, arousal: +0.5 },
  Horror:      { valence: -0.6, arousal: +0.9 },
  Thriller:    { valence: -0.3, arousal: +0.8 },
  Crime:       { valence: -0.3, arousal: +0.5 },
  War:         { valence: -0.5, arousal: +0.7 },
  Drama:       { valence: -0.1, arousal: +0.1 },
  History:     { valence: -0.1, arousal: +0.2 },
  Documentary: { valence:  0.0, arousal:  0.0 },
  Western:     { valence: -0.1, arousal: +0.4 },
  Mystery:     { valence: -0.1, arousal: +0.4 },
  "TV Movie":  { valence:  0.0, arousal:  0.0 },
};

/** Compute valence/arousal for a movie from its genres */
export function movieVA(
  movie: TmdbMovie,
  genres: TmdbGenre[],
): { valence: number; arousal: number } {
  const names = movie.genre_ids
    .map((id) => genres.find((g) => g.id === id)?.name)
    .filter(Boolean) as string[];

  if (names.length === 0) return { valence: 0, arousal: 0 };

  let v = 0, a = 0;
  for (const name of names) {
    const va = GENRE_VA[name];
    if (va) { v += va.valence; a += va.arousal; }
  }

  return { valence: v / names.length, arousal: a / names.length };
}

/** Euclidean distance in VA space */
export function moodDistance(
  a: { valence: number; arousal: number },
  b: { valence: number; arousal: number },
): number {
  return Math.sqrt((a.valence - b.valence) ** 2 + (a.arousal - b.arousal) ** 2);
}

// ── Color Swatch Generation ──

interface SwatchSpec {
  id: string;
  valence: number;
  arousal: number;
  satRange: [number, number];
  lightRange: [number, number];
  hueRange: [number, number];
}

const SWATCH_SPECS: SwatchSpec[] = [
  // Q1: bright + saturated (warm vivids) — happy/excited
  { id: "swatch-q1", valence: +0.7, arousal: +0.7, satRange: [75, 95], lightRange: [55, 70], hueRange: [0, 60] },
  // Q2: dark + saturated (cool intense) — tense/angry
  { id: "swatch-q2", valence: -0.5, arousal: +0.7, satRange: [70, 90], lightRange: [20, 35], hueRange: [220, 300] },
  // Q3: dark + desaturated (muted darks) — sad/melancholy
  { id: "swatch-q3", valence: -0.5, arousal: -0.5, satRange: [10, 30], lightRange: [15, 30], hueRange: [200, 260] },
  // Q4: bright + desaturated (soft pastels) — calm/relaxed
  { id: "swatch-q4", valence: +0.5, arousal: -0.5, satRange: [20, 40], lightRange: [70, 85], hueRange: [150, 210] },
  // Center: medium — neutral
  { id: "swatch-center", valence: 0, arousal: 0, satRange: [35, 55], lightRange: [40, 55], hueRange: [0, 360] },
];

function randInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function hslColor(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

export function generateColorSwatches(): ColorSwatch[] {
  const swatches = SWATCH_SPECS.map((spec) => {
    const h = randInRange(spec.hueRange[0], spec.hueRange[1]);
    const s = randInRange(spec.satRange[0], spec.satRange[1]);
    const l = randInRange(spec.lightRange[0], spec.lightRange[1]);

    return {
      id: spec.id,
      color: hslColor(h, s, l),
      valence: spec.valence,
      arousal: spec.arousal,
    };
  });

  return shuffleArray(swatches);
}

// ── Vibe / Painting Generation ──

/**
 * Art style search queries mapped to VA quadrants.
 * Each query targets the Art Institute of Chicago API.
 */
export interface VibeSpec {
  id: string;
  valence: number;
  arousal: number;
  query: string;
}

export const VIBE_SPECS: VibeSpec[] = [
  // Q1: happy/energetic — Impressionism, bright colors, movement
  { id: "vibe-energetic", valence: +0.6, arousal: +0.7, query: "Impressionism landscape color" },
  // Q2: tense/intense — Expressionism, dark, dramatic
  { id: "vibe-chaotic", valence: -0.5, arousal: +0.8, query: "Expressionism dark dramatic" },
  // Q3: sad/melancholy — dark realism, still, somber
  { id: "vibe-still", valence: -0.4, arousal: -0.6, query: "Romanticism melancholy night" },
  // Q4: calm/peaceful — serene, pastoral, soft
  { id: "vibe-flowing", valence: +0.5, arousal: -0.4, query: "pastoral serene garden" },
  // Center: classical, balanced
  { id: "vibe-balanced", valence: 0, arousal: 0, query: "Renaissance portrait classical" },
];

/** Build IIIF image URL from an AIC image_id */
export function aicImageUrl(imageId: string, width = 843): string {
  return `https://www.artic.edu/iiif/2/${imageId}/full/${width},/0/default.jpg`;
}

// ── Emotion Pool (Yale Mood Meter — 80 emotions on VA circumplex) ──
//
// Grid: 10 columns (valence -0.9 to +0.9) × 8 rows (arousal +0.9 to -0.9)
// Quadrants: Red (high-A, low-V), Yellow (high-A, high-V),
//            Blue (low-A, low-V), Green (low-A, high-V)

function buildEmotionPool(): EmotionCard[] {
  const grid: [string, number, number][] = [
    // ── Row 1 (A = +0.9) ──
    ["Enraged",     -0.9, +0.9], ["Panicked",    -0.7, +0.9], ["Stressed",     -0.5, +0.9], ["Jittery",      -0.3, +0.9], ["Shocked",      -0.1, +0.9],
    ["Surprised",   +0.1, +0.9], ["Upbeat",      +0.3, +0.9], ["Festive",      +0.5, +0.9], ["Exhilarated",  +0.7, +0.9], ["Ecstatic",     +0.9, +0.9],
    // ── Row 2 (A = +0.65) ──
    ["Livid",       -0.9, +0.65], ["Furious",     -0.7, +0.65], ["Frustrated",  -0.5, +0.65], ["Tense",       -0.3, +0.65], ["Stunned",     -0.1, +0.65],
    ["Hyper",       +0.1, +0.65], ["Cheerful",    +0.3, +0.65], ["Motivated",   +0.5, +0.65], ["Inspired",    +0.7, +0.65], ["Elated",      +0.9, +0.65],
    // ── Row 3 (A = +0.4) ──
    ["Fuming",      -0.9, +0.4], ["Frightened",  -0.7, +0.4], ["Angry",        -0.5, +0.4], ["Nervous",      -0.3, +0.4], ["Restless",     -0.1, +0.4],
    ["Energized",   +0.1, +0.4], ["Lively",      +0.3, +0.4], ["Enthusiastic", +0.5, +0.4], ["Optimistic",   +0.7, +0.4], ["Excited",      +0.9, +0.4],
    // ── Row 4 (A = +0.15) ──
    ["Anxious",     -0.9, +0.15], ["Apprehensive",-0.7, +0.15], ["Worried",    -0.5, +0.15], ["Irritated",   -0.3, +0.15], ["Annoyed",     -0.1, +0.15],
    ["Pleasant",    +0.1, +0.15], ["Joyful",      +0.3, +0.15], ["Hopeful",    +0.5, +0.15], ["Playful",     +0.7, +0.15], ["Blissful",    +0.9, +0.15],
    // ── Row 5 (A = -0.15) ──
    ["Repulsed",    -0.9, -0.15], ["Troubled",    -0.7, -0.15], ["Concerned",  -0.5, -0.15], ["Uneasy",      -0.3, -0.15], ["Peeved",      -0.1, -0.15],
    ["At Ease",     +0.1, -0.15], ["Easygoing",   +0.3, -0.15], ["Content",    +0.5, -0.15], ["Loving",      +0.7, -0.15], ["Fulfilled",   +0.9, -0.15],
    // ── Row 6 (A = -0.4) ──
    ["Disgusted",   -0.9, -0.4], ["Glum",        -0.7, -0.4], ["Disappointed", -0.5, -0.4], ["Down",         -0.3, -0.4], ["Apathetic",    -0.1, -0.4],
    ["Calm",        +0.1, -0.4], ["Secure",       +0.3, -0.4], ["Satisfied",    +0.5, -0.4], ["Grateful",     +0.7, -0.4], ["Touched",      +0.9, -0.4],
    // ── Row 7 (A = -0.65) ──
    ["Pessimistic", -0.9, -0.65], ["Morose",     -0.7, -0.65], ["Discouraged", -0.5, -0.65], ["Sad",         -0.3, -0.65], ["Bored",       -0.1, -0.65],
    ["Mellow",      +0.1, -0.65], ["Thoughtful",  +0.3, -0.65], ["Peaceful",   +0.5, -0.65], ["Comfortable", +0.7, -0.65], ["Carefree",    +0.9, -0.65],
    // ── Row 8 (A = -0.9) ──
    ["Alienated",   -0.9, -0.9], ["Miserable",   -0.7, -0.9], ["Lonely",       -0.5, -0.9], ["Disheartened", -0.3, -0.9], ["Tired",        -0.1, -0.9],
    ["Sleepy",      +0.1, -0.9], ["Tranquil",     +0.3, -0.9], ["Relaxed",      +0.5, -0.9], ["Blessed",      +0.7, -0.9], ["Serene",       +0.9, -0.9],
  ];

  return grid.map(([label, valence, arousal]) => ({
    id: `emotion-${label.toLowerCase().replace(/\s+/g, "-")}`,
    label,
    valence,
    arousal,
  }));
}

export const EMOTION_POOL: EmotionCard[] = buildEmotionPool();

/**
 * Select 5 emotion cards based on the user's current VA estimate.
 *
 * Strategy: take 10 nearest emotions + 5 from further away (contrast),
 * then use farthest-first traversal to pick 5 with maximum spread.
 * This gives confirmation options near the predicted mood plus
 * contrast options that let the user course-correct.
 */
export function selectEmotionCards(
  currentVA: { valence: number; arousal: number },
  count = 5,
  excludeIds?: Set<string>,
): EmotionCard[] {
  const available = excludeIds
    ? EMOTION_POOL.filter((e) => !excludeIds.has(e.id))
    : EMOTION_POOL;
  const sorted = [...available].sort((a, b) =>
    moodDistance(a, currentVA) - moodDistance(b, currentVA),
  );

  // Nearest 10 (confirmation zone) + 5 from positions 20-40 (contrast zone)
  const nearby = sorted.slice(0, 10);
  const contrast = shuffleArray(sorted.slice(20, 40)).slice(0, 5);
  const candidates = [...nearby, ...contrast];

  // Farthest-first traversal: maximise minimum pairwise distance among picks
  const picked: EmotionCard[] = [candidates[0]]; // start with closest
  const remaining = candidates.slice(1);

  while (picked.length < count && remaining.length > 0) {
    let bestIdx = 0;
    let bestMinDist = -1;

    for (let i = 0; i < remaining.length; i++) {
      const minDist = Math.min(
        ...picked.map((p) => moodDistance(remaining[i], p)),
      );
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestIdx = i;
      }
    }

    picked.push(remaining.splice(bestIdx, 1)[0]);
  }

  return shuffleArray(picked);
}

// ── Utility ──

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
