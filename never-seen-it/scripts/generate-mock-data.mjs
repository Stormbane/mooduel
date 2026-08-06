// Generates src/data/mock-movies.json: 300 invented movies spread across
// the mood space. Deterministic (fixed seed) so the committed JSON is stable.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x5eed1);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const int = (min, max) => min + Math.floor(rng() * (max - min + 1));
const round2 = (x) => Math.round(x * 100) / 100;

const T1 = ["The", "A", "Last", "First", "Cold", "Quiet", "Broken", "Paper", "Iron", "Hollow", "Silent", "Burning", "Little", "Midnight", "Northern", "Foreign", "Patient", "Crooked", "Hungry", "Pale"];
const T2 = ["Harvest", "Winter", "Daughter", "Machine", "Orchard", "Signal", "Border", "Wedding", "Debt", "Garden", "Ferry", "Archive", "Butcher", "Lantern", "Reservoir", "Passenger", "Accordion", "Parliament", "Comet", "Laundry", "Sparrow", "Furnace", "Meridian", "Vigil", "Carousel"];
const T3 = ["of Glass", "of the North", "in Winter", "at Dawn", "of Small Hours", "on the Vistula", "of Dust", "under Snow", "in Exile", "of the Harbor", "by Nightfall", "of Ninth Street", "in the Reeds", "of Two Rivers", "after the Rain"];
const COUNTRIES = ["BG", "PL", "HU", "CZ", "RO", "FR", "IT", "JP", "KR", "AR", "BR", "SE", "FI", "TR", "GR", "PT", "MX", "IR", "IN", "CA", "AU", "NZ", "DE", "YU", "SU"];
const GENRES = ["Drama", "Thriller", "Comedy", "Romance", "Horror", "Mystery", "Crime", "War", "Western", "Science Fiction", "Fantasy", "Documentary", "Family", "Adventure", "Music", "History"];
const ARCS = ["man-in-a-hole", "oedipus", "riches-to-rags", "icarus", "rags-to-riches", "steady", "cinderella"];
const PACING = ["slow-burn", "building", "steady", "relentless", "episodic"];
const ENDINGS = ["triumphant", "bittersweet", "devastating", "ambiguous", "twist", "uplifting", "unsettling"];
const EMOTIONS = ["melancholy", "longing", "dread", "joy", "tenderness", "rage", "wonder", "grief", "hope", "unease", "nostalgia", "defiance", "pity", "glee", "awe"];
const TAGS = ["wintry", "quiet", "rural", "neon", "sweaty", "bureaucratic", "seaside", "nocturnal", "dusty", "feverish", "domestic", "industrial", "pastoral", "smoky", "rain-soaked", "sun-bleached", "claustrophobic", "windswept"];
const CONTEXTS = ["solo", "date", "rainy-sunday", "late-night", "family", "with-friends", "hungover", "post-breakup"];

const WHO = ["Two brothers", "A retired customs officer", "A young seamstress", "The village schoolteacher", "An insomniac projectionist", "A disgraced chess champion", "Three generations of women", "A traveling dentist", "The last lighthouse keeper", "A minor bureaucrat", "An aging wedding singer", "A deaf locksmith", "A night-shift radio host", "The mayor's estranged son", "A collective farm accountant"];
const DOES = ["returns to the village", "inherits a failing cinema", "discovers a hidden letter", "loses everything in one night", "falls for the wrong person", "is accused of a crime nobody names", "sets out across the marshes", "refuses to sell the orchard", "starts hearing the neighbors through the wall", "wins an absurd prize", "must bury an enemy with honor", "takes in a stranger from the ferry", "finds the town's missing bell", "begins forging tickets to a better life", "watches the reservoir swallow the valley"];
const TWIST = ["and the past follows close behind", "as the first snow cuts the roads", "while the authorities circle quietly", "and nothing is what the rumors said", "as an old debt comes due", "and the silence begins to talk", "while the whole town watches", "and love arrives at the worst hour", "as the machines refuse to stop", "and the river gives up its secret", "while a stranger counts the days", "and the feast turns into a reckoning"];

const VIBE_A = ["A slow thaw of a film", "A pressure cooker in Sunday clothes", "A lullaby with a knife in it", "A long walk home in the dark", "A warm kitchen with a cold draft", "A fever dream on a budget", "A love letter nobody mails", "A shrug that turns into a sob", "A dance at the end of the world", "A joke told at a funeral"];
const VIBE_B = ["that trades hope in whispers", "that never raises its voice", "that grins through broken teeth", "that smells of diesel and rain", "that keeps its best secret for last", "that loves its monsters", "that forgives no one", "that ends before you are ready", "that hums to itself in the dark", "that leaves the light on for you"];

function mood() {
  const s = () => round2(rng() * 2 - 1);
  const u = () => round2(rng());
  const nEm = int(2, 3), nTag = int(2, 4), nCtx = int(1, 3);
  const sample = (arr, n) => {
    const c = [...arr], out = [];
    for (let i = 0; i < n; i++) out.push(c.splice(Math.floor(rng() * c.length), 1)[0]);
    return out;
  };
  return {
    valence: s(), arousal: s(), dominance: s(),
    absorption: u(), hedonic: u(), eudaimonic: u(),
    psych_rich: u(), conversation_potential: u(), comfort_level: u(),
    emotional_arc: pick(ARCS), pacing: pick(PACING), ending_type: pick(ENDINGS),
    dominant_emotions: sample(EMOTIONS, nEm),
    mood_tags: sample(TAGS, nTag),
    watch_context: sample(CONTEXTS, nCtx),
  };
}

const seen = new Set();
const movies = [];
let id = 100001;
while (movies.length < 300) {
  let title = `${pick(T1)} ${pick(T2)}`;
  if (rng() < 0.35) title += ` ${pick(T3)}`;
  if (seen.has(title)) continue;
  seen.add(title);
  const nGenres = int(1, 3);
  const gs = [];
  while (gs.length < nGenres) { const g = pick(GENRES); if (!gs.includes(g)) gs.push(g); }
  movies.push({
    tmdb_id: id++,
    title,
    year: int(1948, 2019),
    country: pick(COUNTRIES),
    runtime: int(74, 168),
    genres: gs,
    popularity: round2(rng() * 4),
    poster_url: "proc:",
    synopsis: `${pick(WHO)} ${pick(DOES)}, ${pick(TWIST)}.`,
    vibe_sentence: `${pick(VIBE_A)} ${pick(VIBE_B)}.`,
    mood: mood(),
  });
}

const out = join(here, "..", "src", "data", "mock-movies.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ dataset_version: "mock-1", movies }, null, 1));
console.log(`Wrote ${movies.length} movies to ${out}`);
