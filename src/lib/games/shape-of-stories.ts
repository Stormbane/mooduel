/**
 * Shape of Stories — pure game logic. The six Vonnegut curves, reveal
 * copy, run scoring. UI lives in src/app/games/shape-of-stories/page.tsx.
 *
 * Choice slugs match the movies.emotional_arc vocabulary exactly, so
 * signals aggregate directly against the dimension they rebuild. The
 * dimension needs rebuilding because the classifier collapsed to a mode:
 * ~64% of the corpus is currently labeled man-in-a-hole.
 */

export const SOS_RUN_LENGTH = 8;
export const SOS_PROMPT_VERSION = "sos-v1";

export interface StoryShape {
  slug: string;
  name: string;
  /** Four-word gloss under the curve. */
  hint: string;
  /** Share-grid glyph. */
  glyph: string;
  /** SVG path, viewBox 0 0 100 56, stroke only. */
  path: string;
}

export const SHAPES: StoryShape[] = [
  {
    slug: "rags-to-riches",
    name: "Rags to Riches",
    hint: "Up, and up.",
    glyph: "↗",
    path: "M6,48 C30,46 62,26 94,8",
  },
  {
    slug: "riches-to-rags",
    name: "Tragedy",
    hint: "Down, and down.",
    glyph: "↘",
    path: "M6,8 C38,26 70,46 94,48",
  },
  {
    slug: "man-in-a-hole",
    name: "Man in a Hole",
    hint: "Fall in, climb out.",
    glyph: "∪",
    path: "M6,14 C22,40 34,48 50,48 C66,48 78,38 94,12",
  },
  {
    slug: "icarus",
    name: "Icarus",
    hint: "Soar, then the sun.",
    glyph: "∩",
    path: "M6,44 C22,16 38,8 52,8 C68,8 80,26 94,46",
  },
  {
    slug: "cinderella",
    name: "Cinderella",
    hint: "Rise, setback, rise.",
    glyph: "∿",
    path: "M6,48 C18,34 26,30 34,32 C44,35 48,44 56,44 C72,42 84,22 94,8",
  },
  {
    slug: "oedipus",
    name: "Oedipus",
    hint: "Fall, hope, fall.",
    glyph: "≈",
    path: "M6,10 C18,24 26,28 34,26 C44,24 48,14 56,14 C72,16 84,36 94,48",
  },
];

export const SHAPE_BY_SLUG = new Map(SHAPES.map((s) => [s.slug, s]));

export interface ShapedRecord {
  movieId: number;
  title: string;
  year: number;
  pickedSlug: string;
  modelLabel: string | null;
  agreed: boolean;
}

export interface SosStats {
  runs: number;
  shaped: number;
  agreed: number;
  skips: number;
}

export const SOS_STATS_KEY = "mooduel:shape-of-stories:stats";
export const SOS_EMPTY_STATS: SosStats = { runs: 0, shaped: 0, agreed: 0, skips: 0 };

/** The reveal line under a shaped movie. */
export function revealLine(pickedSlug: string, modelLabel: string | null): string {
  if (modelLabel === pickedSlug) return "The model drew the same line.";
  const modelShape = modelLabel ? SHAPE_BY_SLUG.get(modelLabel) : null;
  if (!modelShape) return "The model never managed a shape for this one. Yours is the first.";
  return `The model had ${modelShape.name}. Your line overrules it.`;
}
