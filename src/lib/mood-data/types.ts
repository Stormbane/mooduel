/** Slim movie mood record — matches the public/mood-data.json shape */
export interface SlimMoodMovie {
  id: number;
  t: string;     // title
  y: number;     // year
  g: string[];   // genres
  rt: number | null; // runtime
  r: number | null;  // tmdb rating
  v: string;     // vibe sentence
  va: number;    // valence -1..1
  ar: number;    // arousal -1..1
  do: number;    // dominance -1..1
  ab: number;    // absorption 0..1
  he: number;    // hedonic 0..1
  eu: number;    // eudaimonic 0..1
  pr: number;    // psychologically rich 0..1
  arc: string;   // emotional arc
  em: string[];  // dominant emotions
  tags: string[]; // mood tags
  wc: string[];  // watch context
  pa: string;    // pacing
  end: string;   // ending type
  co: number;    // comfort level 0..1
  warn: string[]; // safety warnings
  conv: number;  // conversation potential 0..1
  rtc?: number;  // rotten tomatoes critic score 0-100
  rta?: number;  // rotten tomatoes audience score 0-100
  imdb?: number; // imdb rating 1-10
}

/** Expand slim fields to readable names (for display) */
export function expandMovie(m: SlimMoodMovie) {
  return {
    tmdbId: m.id,
    title: m.t,
    year: m.y,
    genres: m.g,
    runtime: m.rt,
    tmdbRating: m.r,
    vibeSentence: m.v,
    valence: m.va,
    arousal: m.ar,
    dominance: m.do,
    absorptionPotential: m.ab,
    hedonicValence: m.he,
    eudaimonicValence: m.eu,
    psychologicallyRichValence: m.pr,
    emotionalArc: m.arc,
    dominantEmotions: m.em,
    moodTags: m.tags,
    watchContext: m.wc,
    pacing: m.pa,
    endingType: m.end,
    comfortLevel: m.co,
    emotionalSafetyWarnings: m.warn,
    conversationPotential: m.conv,
  };
}

export type ExpandedMovie = ReturnType<typeof expandMovie>;
