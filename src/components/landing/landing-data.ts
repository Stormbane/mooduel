// ââ Design tokens ââ
export const TOKENS = {
  radius: "rounded-[4px]",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  surface: "bg-[oklch(0.12_0_0)]",
  border: "border-[oklch(0.25_0_0)]",
} as const;

// ââ Types ââ
export interface FieldExample {
  movie: string;
  year: number;
  value: string;
  note: string;
}

// ââ Poster paths (TMDB w92) ââ
export const POSTER_MAP: Record<string, string> = {
  "Singin' in the Rain": "/w03EiJVHP8Un77boQeE7hg9DVdU.jpg",
  "Requiem for a Dream": "/nOd6vjEmzCT0k4VYqsA2hwyi87C.jpg",
  "The Truman Show": "/vuza0WqY239yBXOadKlGwJsZJFE.jpg",
  "Mad Max: Fury Road": "/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
  "Lost in Translation": "/3jCLmYDIIiSMPujbwygNpqdpM8N.jpg",
  "Jurassic Park": "/maFjKnJ62hDQ9E66dKqDZgbUy0H.jpg",
  "Rocky": "/hEjK9A9BkNXejFW4tfacVAEHtkn.jpg",
  "Hereditary": "/hjlZSXM86wJrfCv5VKfR5DI2VeU.jpg",
  "Ocean's Eleven": "/hQQCdZrsHtZyR6NbKH2YyCqd2fR.jpg",
  "Inception": "/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg",
  "Scary Movie": "/fVQFPRuw3yWXojYDJvA5EoFjUOY.jpg",
  "The Grand Budapest Hotel": "/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
  "Superbad": "/ek8e8txUyUwd2BNqj6lFEerJfbq.jpg",
  "Schindler's List": "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
  "Guardians of the Galaxy": "/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg",
  "12 Angry Men": "/2QXLVh32JKaWTjFJU3n8aIxRK9P.jpg",
  "The Hangover": "/A0uS9rHR56FeBtpjVki16M5xxSW.jpg",
  "Good Will Hunting": "/z2FnLKpFi1HPO7BEJxdkv6hpJSU.jpg",
  "Parasite": "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
  "Home Alone": "/onTSipZ8R3bliBdKfPtsDuHTdlL.jpg",
  "Eternal Sunshine of the Spotless Mind": "/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg",
  "The Shawshank Redemption": "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
  "Chinatown": "/kZRSP3FmOcq0xnBulqpUQngJUXY.jpg",
  "Forrest Gump": "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
  "Inside Out": "/2H1TmgdfNtsKlU9jKdeNyYL5y8T.jpg",
  "Alien": "/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg",
  "Am\u00e9lie": "/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg",
  "The Social Network": "/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg",
  "My Neighbor Totoro": "/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg",
  "The Big Short": "/scVEaJEwP8zUix8vgmMoJJ9Nq0w.jpg",
  "Midsommar": "/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg",
  "The Princess Bride": "/2FC9L9MrjBoGHYjYZjdWQdopVYb.jpg",
  "Borat": "/kfkyALfD4G1mlBJI1lOt2QCra4i.jpg",
  "La La Land": "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
  "No Country for Old Men": "/6d5XOczc226jECq0LIX0siKtgHR.jpg",
  "WALL-E": "/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg",
  "Whiplash": "/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
  "The Big Lebowski": "/3bv6WAp6BSxxYvB5ozKFUYuRA8C.jpg",
  "Pulp Fiction": "/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg",
  "Toy Story 3": "/AbbXspMOwdvwWZgVN0nabZq03Ec.jpg",
  "Se7en": "/191nKfP0ehp3uIvWqgPbFmI4lv9.jpg",
  "The Dark Knight": "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "Paddington 2": "/1OJ9vkD5xPt3skC6KguyXAgagRZ.jpg",
  "Irr\u00e9versible": "/rxeDxo8FvZpLu6iplNpxdtAVnfu.jpg",
  "Spirited Away": "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
  "Grave of the Fireflies": "/k9tv1rXZbOhH7eiCk378x61kNQ1.jpg",
  "The Lion King": "/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg",
  "A Clockwork Orange": "/4sHeTAp65WrSSuc05nRBKddhBxO.jpg",
  "Mulholland Drive": "/x7A59t6ySylr1L7aubOQEA480vM.jpg",
  "Transformers: Age of Extinction": "/jyzrfx2WaeY60kYZpPYepSjGz4S.jpg",
  "Get Out": "/mE24wUCfjK8AoBBjaMjho7Rczr7.jpg",
};

// ââ Godfather poster ââ
export const GODFATHER_POSTER = "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg";

export interface DataField {
  key: string;
  value: string;
  label: string;
  color: string;
  descShort: string;
  rangeType: "scale" | "enum" | "freeform";
  rangeMin?: string;
  rangeMax?: string;
  rangeMinLabel?: string;
  rangeMaxLabel?: string;
  enumValues?: { value: string; label: string }[];
  justification: string;
  source: string;
  sourceUrl?: string;
  sourceDetail: string;
  examples: FieldExample[];
  comparison?: string;
}

// ââ Vibe sentences ââ
export const VIBES = [
  "Quiet resilience meeting hope; freedom earned through patient faith.",
  "Sweaty panic and laughter wrapping around the ache of growing apart.",
  "Two hours of white-knuckle momentum through apocalyptic desert fury.",
  "Ancestral horror wearing family's face; descent into madness you cannot stop.",
  "Quiet grief and blue light; the tenderness of being finally, almost seen.",
  "Brilliant deception unraveling under the weight of impossible class structures.",
  "Symmetrical beauty preserving friendship in amber as time dissolves it.",
  "Floating houses and broken hearts learning to soar together.",
  "Genius without conscience, success without satisfaction.",
  "Sensory overload collapsing into quiet, hard-won grace.",
  "Revenge dressed in elegance, served across decades with surgical patience.",
  "Lonely astronaut finding more humanity in silence than Earth ever offered.",
  "Childhood wonder rotting into adult compromise; nostalgia that cuts.",
  "Dancing through systemic collapse because the music hasn't stopped yet.",
  "Love letter to a city that doesn't love you back, written in neon and rain.",
  "The comedy of pretending everything is fine while the house burns down.",
  "Ocean-deep grief disguised as a road trip with terrible snacks.",
  "Adrenaline and brotherhood at thirty thousand feet with nowhere to land.",
  "Slow-burn seduction between two people who will absolutely destroy each other.",
  "Found family in the wreckage; tenderness between people who forgot how.",
];

// Accent colors that cycle through the marquee separators
export const VIBE_COLORS = [
  "#E91E8C", // pink
  "#8B5CF6", // purple
  "#38BDF8", // sky
  "#1ED760", // green
  "#F97316", // orange
  "#FBBF24", // amber
  "#FF6B6B", // coral
];

// -- All 18 dimension fields (The Godfather as reference movie) --
export const DATA_FIELDS: DataField[] = [
  {
    key: "valence",
    value: "-0.3",
    label: "Valence",
    color: "#E91E8C",
    descShort: "The emotional tone a film leaves you with. A negative score doesn't mean a bad movie.",
    rangeType: "scale",
    rangeMin: "-1.0",
    rangeMax: "+1.0",
    rangeMinLabel: "deeply unpleasant",
    rangeMaxLabel: "deeply pleasant",
    justification: "The Godfather sits at −0.3. Grief, moral compromise, and creeping corruption dominate, but there's enough family warmth to keep it from the bottom of the scale.",
    source: "Russell\u2019s Circumplex Model of Affect (1980)",
    sourceUrl: "https://doi.org/10.1037/h0077714",
    sourceDetail: "Valence is the single most predictive dimension for mood-based recommendation \u2014 it answers the most basic question: will this leave me feeling good or bad? Grounded in Russell\u2019s Circumplex Model, which maps all human affect onto two orthogonal axes. No other dimension captures emotional polarity as directly.",
    examples: [
      { movie: "Singin' in the Rain", year: 1952, value: "0.9", note: "Pure cinematic joy \u2014 nearly every scene radiates warmth" },
      { movie: "Requiem for a Dream", year: 2000, value: "\u22120.9", note: "Relentlessly bleak descent with almost no reprieve" },
      { movie: "The Truman Show", year: 1998, value: "0.3", note: "Starts uneasy but lands on genuine hope" },
    ],
    comparison: "Singin' in the Rain (0.9) and Requiem for a Dream (-0.9) nearly max out opposite ends of the scale. The Truman Show lands at a mild positive despite its dark premise - the hopeful ending pulls it up, showing that valence tracks cumulative feeling, not subject matter.",
  },
  {
    key: "arousal",
    value: "0.35",
    label: "Arousal",
    color: "#FF6B6B",
    descShort: "How wired you feel while watching. This is about intensity, not whether the feeling is good or bad.",
    rangeType: "scale",
    rangeMin: "-1.0",
    rangeMax: "+1.0",
    rangeMinLabel: "deeply calm, meditative",
    rangeMaxLabel: "edge-of-seat intensity",
    justification: "The Godfather scores 0.35. A slow simmer. The tension builds through dread and unspoken threats, not through action or jump scares.",
    source: "Russell\u2019s Circumplex Model of Affect (1980)",
    sourceUrl: "https://doi.org/10.1037/h0077714",
    sourceDetail: "Arousal captures intensity independent of whether the feeling is positive or negative. A horror film and an action comedy can both score 0.9 here for completely different reasons. This makes it essential for matching viewers to the energy level they want.",
    examples: [
      { movie: "Mad Max: Fury Road", year: 2015, value: "0.95", note: "Unrelenting vehicular chaos that barely lets you breathe" },
      { movie: "Lost in Translation", year: 2003, value: "0.05", note: "Hushed, meditative loneliness that asks you to sit still" },
      { movie: "Jurassic Park", year: 1993, value: "0.7", note: "Alternates between wonder and genuine terror" },
    ],
    comparison: "Mad Max: Fury Road (0.95) is essentially a two-hour chase scene. Lost in Translation (0.05) is so quiet you can hear the hotel hum. Jurassic Park (0.7) proves a film can toggle between wonder and terror, landing high but not at the ceiling.",
  },
  {
    key: "dominance",
    value: "-0.2",
    label: "Dominance",
    color: "#8B5CF6",
    descShort: "Do you feel in control or at the mercy of the story? This is what separates Rocky from Hereditary.",
    rangeType: "scale",
    rangeMin: "-1.0",
    rangeMax: "+1.0",
    rangeMinLabel: "completely overwhelmed",
    rangeMaxLabel: "fully in control",
    justification: "The Godfather scores −0.2. Michael gains enormous power, but you're watching his soul corrode and you can't do anything about it.",
    source: "Mehrabian & Russell\u2019s PAD model (1974)",
    sourceUrl: "https://doi.org/10.1037/h0036578",
    sourceDetail: "Dominance fills the gap left by valence and arousal: two films can be equally intense and equally dark, but one leaves you feeling capable while the other leaves you crushed. Critical for recommendation contexts where the viewer's emotional state matters.",
    examples: [
      { movie: "Rocky", year: 1976, value: "0.7", note: "The archetypal underdog seizing agency against impossible odds" },
      { movie: "Hereditary", year: 2018, value: "\u22120.8", note: "Characters are puppets of forces they cannot resist" },
      { movie: "Ocean's Eleven", year: 2001, value: "0.5", note: "Cool, collected protagonists always one step ahead" },
    ],
    comparison: "Rocky (0.7) leaves you ready to take on the world. Hereditary (-0.8) makes you feel like a passenger in someone else's nightmare. Ocean's Eleven (0.5) is a pleasant middle ground - you admire the crew's control without feeling it yourself.",
  },
  {
    key: "absorptionPotential",
    value: "0.85",
    label: "Absorption",
    color: "#38BDF8",
    descShort: "Will you check your phone, or forget you have one?",
    rangeType: "scale",
    rangeMin: "0.0",
    rangeMax: "1.0",
    rangeMinLabel: "easily distracted, background-friendly",
    rangeMaxLabel: "total immersion, lose track of time",
    justification: "The Godfather scores 0.85. Every glance and silence carries weight. Miss a scene and you've lost a thread.",
    source: "Tellegen & Atkinson (1974)",
    sourceUrl: "https://doi.org/10.1037/h0036681",
    sourceDetail: "Absorption predicts whether a film works as focused viewing or comfortable background noise \u2014 a practical distinction no other dimension captures. It tells you whether to clear your evening or just press play. Rooted in research on total attentional engagement and its relationship to flow states.",
    examples: [
      { movie: "Inception", year: 2010, value: "0.9", note: "Layered dreamscapes that demand and reward total attention" },
      { movie: "Scary Movie", year: 2000, value: "0.15", note: "Designed for half-watching with friends - and that is fine" },
      { movie: "The Grand Budapest Hotel", year: 2014, value: "0.6", note: "Visually absorbing but its artifice keeps you aware" },
    ],
    comparison: "Inception (0.9) builds nested realities that punish inattention. Scary Movie (0.15) is designed for half-watching with friends - and that is fine. The Grand Budapest Hotel (0.6) lands in between, visually absorbing but with a deliberate theatricality that keeps you aware of the craft.",
  },
  {
    key: "hedonicValence",
    value: "0.4",
    label: "Hedonic",
    color: "#FBBF24",
    descShort: "Was it fun? Laughter, thrills, spectacle, warmth. A low score just means the film is doing something else.",
    rangeType: "scale",
    rangeMin: "0.0",
    rangeMax: "1.0",
    rangeMinLabel: "no pleasure at all",
    rangeMaxLabel: "pure, uncomplicated fun",
    justification: "The Godfather scores 0.4. The craft is satisfying, but 'fun' isn't really the word.",
    source: "Kahneman, Diener & Schwarz (1999)",
    sourceUrl: "https://doi.org/10.1017/CBO9780511621222",
    sourceDetail: "Hedonic valence captures the dimension most recommendation systems already optimize for: did you have a good time? By measuring it separately from meaning and psychological richness, we reveal that a low hedonic score is not a failure. Essential for distinguishing crowd-pleasers from challenging masterworks.",
    examples: [
      { movie: "Superbad", year: 2007, value: "0.9", note: "Pure comedic pleasure \u2014 exists to make you laugh" },
      { movie: "Schindler's List", year: 1993, value: "0.05", note: "Devastating and essential, but no one watches it for fun" },
      { movie: "Guardians of the Galaxy", year: 2014, value: "0.75", note: "Action-comedy engineered for maximum crowd-pleasing" },
    ],
    comparison: "Superbad (0.9) exists to make you laugh and succeeds completely. Schindler's List (0.05) is one of the greatest films ever made and scores near zero here - proof that hedonic value and artistic value are independent. Guardians of the Galaxy (0.75) shows you can deliver spectacle and heart together.",
  },
  {
    key: "eudaimonicValence",
    value: "0.85",
    label: "Eudaimonic",
    color: "#1ED760",
    descShort: "Does it make you think about your life? This is why people seek out difficult films on purpose.",
    rangeType: "scale",
    rangeMin: "0.0",
    rangeMax: "1.0",
    rangeMinLabel: "no deeper meaning, pure entertainment",
    rangeMaxLabel: "profoundly meaningful, lingers for days",
    justification: "The Godfather scores 0.85. Power, family obligation, the cost of becoming what you swore you wouldn't. Those themes stick around.",
    source: "Oliver & Raney (2011)",
    sourceUrl: "https://doi.org/10.1111/j.1468-2885.2011.01396.x",
    sourceDetail: "Eudaimonic valence captures what hedonic valence misses entirely: the reason people actively seek out difficult, uncomfortable films. Audiences often prefer meaningful experiences over pleasurable ones, but traditional recommendation systems have no way to express that preference.",
    examples: [
      { movie: "12 Angry Men", year: 1957, value: "0.95", note: "A masterclass in moral reasoning and one person's conviction" },
      { movie: "The Hangover", year: 2009, value: "0.05", note: "Hilarious and disposable \u2014 not meant to linger" },
      { movie: "Good Will Hunting", year: 1997, value: "0.8", note: "Emotional depth about wasted potential and vulnerability" },
    ],
    comparison: "12 Angry Men (0.95) is essentially a feature-length moral argument. The Hangover (0.05) is pure pleasure with no pretense of depth. Good Will Hunting (0.8) finds genuine meaning through emotional vulnerability, landing high without sacrificing accessibility.",
  },
  {
    key: "psychologicallyRichValence",
    value: "0.7",
    label: "Psych. Richness",
    color: "#8B5CF6",
    descShort: "Do you see the world a bit differently after? Not lessons or morals, just a shifted lens.",
    rangeType: "scale",
    rangeMin: "0.0",
    rangeMax: "1.0",
    rangeMinLabel: "reinforces existing worldview",
    rangeMaxLabel: "fundamentally shifts perspective",
    justification: "The Godfather scores 0.7. It drops you into a world where loyalty and violence are the same thing, and you can't quite tell where honor stops.",
    source: "Oishi & Westgate (2022)",
    sourceUrl: "https://doi.org/10.1037/rev0000317",
    sourceDetail: "Psychological richness fills the gap between hedonic and eudaimonic valence: some films are neither fun nor morally instructive, but they permanently alter how you see the world. A viewer might not enjoy the experience yet still consider it valuable because it expanded their understanding.",
    examples: [
      { movie: "Parasite", year: 2019, value: "0.9", note: "Reframes how you see class, aspiration, and who deserves what" },
      { movie: "Home Alone", year: 1990, value: "0.05", note: "Delightful slapstick that doesn't shift your worldview" },
      { movie: "Eternal Sunshine of the Spotless Mind", year: 2004, value: "0.8", note: "Makes you reconsider the role of painful memories" },
    ],
    comparison: "Parasite (0.9) permanently reframes how you see class and aspiration. Home Alone (0.05) is a warm, familiar comfort that asks nothing of your worldview. Eternal Sunshine (0.8) poses a question - would you erase painful memories if it meant losing the growth? - that changes how you think about loss itself.",
  },
  {
    key: "emotionalArc",
    value: "\"oedipus\"",
    label: "Emotional Arc",
    color: "#E91E8C",
    descShort: "The shape of how feeling moves through the runtime.",
    rangeType: "enum",
    enumValues: [
      { value: "cinderella", label: "rise after long suffering" },
      { value: "man-in-a-hole", label: "fall then recovery" },
      { value: "rags-to-riches", label: "steady ascent" },
      { value: "riches-to-rags", label: "steady decline" },
      { value: "oedipus", label: "rise concealing a fall" },
      { value: "icarus", label: "rise then collapse" },
      { value: "tragedy", label: "sustained decline" },
    ],
    justification: "The Godfather follows the oedipus arc. Michael's rise looks like success, but the audience can feel the moral destruction underneath.",
    source: "Vonnegut\u2019s story shapes; Reagan et al. (2016)",
    sourceUrl: "https://doi.org/10.1140/epjds/s13688-016-0093-1",
    sourceDetail: "Emotional arc captures the shape of the viewing experience over time, which no static score can express. Two films with identical valence and ending type can feel completely different because of how they distribute tension and relief across their runtime.",
    examples: [
      { movie: "The Shawshank Redemption", year: 1994, value: "cinderella", note: "Sustained suffering culminating in triumphant liberation" },
      { movie: "Chinatown", year: 1974, value: "tragedy", note: "Every attempt to do right accelerates the catastrophe" },
      { movie: "Forrest Gump", year: 1994, value: "rags-to-riches", note: "Improbable, steady ascent from nobody to witness of history" },
    ],
    comparison: "Shawshank Redemption (cinderella) makes you endure years of suffering before the payoff. Chinatown (tragedy) tightens the noose with every scene until the final line destroys you. Forrest Gump (rags-to-riches) just keeps ascending - three completely different shapes of feeling across time.",
  },
  {
    key: "dominantEmotions",
    value: "[\"sadness\", \"anticipation\", \"anger\"]",
    label: "Dominant Emotions",
    color: "#FF6B6B",
    descShort: "What you actually feel watching, not what the characters feel.",
    rangeType: "enum",
    enumValues: [
      { value: "joy", label: "happiness, delight" },
      { value: "trust", label: "safety, acceptance" },
      { value: "fear", label: "dread, anxiety" },
      { value: "surprise", label: "shock, disbelief" },
      { value: "sadness", label: "grief, loss" },
      { value: "disgust", label: "revulsion, rejection" },
      { value: "anger", label: "outrage, injustice" },
      { value: "anticipation", label: "tension, expectation" },
    ],
    justification: "The Godfather evokes sadness (watching Michael's corruption), anticipation (every negotiation), and anger (the betrayals).",
    source: "Plutchik\u2019s Wheel of Emotions (1980)",
    sourceUrl: "https://doi.org/10.1016/B978-0-12-558701-3.50007-7",
    sourceDetail: "Where valence gives you a single number, dominant emotions tell you the specific cocktail. Two films can both score \u22120.3 on valence but feel entirely different \u2014 one through fear and disgust, another through sadness and anger. This turns a flat number into a recognizable emotional fingerprint.",
    examples: [
      { movie: "Inside Out", year: 2015, value: "joy, sadness, nostalgia", note: "Literally personifies emotions and makes you feel each one" },
      { movie: "Alien", year: 1979, value: "fear, dread, helplessness", note: "Claustrophobic terror where every shadow could be death" },
      { movie: "Am\u00e9lie", year: 2001, value: "delight, whimsy, tenderness", note: "A warm bath of gentle optimism and playful connection" },
    ],
    comparison: "Inside Out literally personifies emotions and makes you feel each one by name. Alien weaponizes silence and shadow to produce sustained terror. Amelie wraps you in warmth and whimsy - three films targeting completely different emotional registers.",
  },
  {
    key: "moodTags",
    value: "[\"corruption\", \"power-struggle\", \"tragic\", \"family-bonds\"]",
    label: "Mood Tags",
    color: "#F97316",
    descShort: "What genre labels can't tell you. Free-form tags for actual emotional texture.",
    rangeType: "freeform",
    justification: "The Godfather gets corruption, power-struggle, tragic, family-bonds. Genre says 'Crime Drama.' Tags say why it hits different.",
    source: "AI classifier synthesis",
    sourceDetail: "Mood tags fill the gap between structured dimensions and actual film texture. Valence and arousal can match two completely different dramas; tags differentiate them. They're the closest the dataset gets to how people actually describe movies to friends \u2014 specific, evocative, and unconstrained by categories.",
    examples: [
      { movie: "The Social Network", year: 2010, value: "ambition, betrayal", note: "Friendship sacrificed on the altar of billion-dollar ego" },
      { movie: "My Neighbor Totoro", year: 1988, value: "innocence, wonder", note: "Childhood magic with zero cynicism" },
      { movie: "The Big Short", year: 2015, value: "outrage, absurdity", note: "Systemic rot played for dark laughs that leave you furious" },
    ],
    comparison: "The Social Network (ambition, betrayal) and My Neighbor Totoro (innocence, wonder) are both listed as dramas on some platforms - tags immediately reveal they have nothing in common emotionally. The Big Short (outrage, absurdity) shows tags can capture tonal contradiction that genre labels cannot.",
  },
  {
    key: "watchContext",
    value: "[\"solo\", \"friends\"]",
    label: "Watch Context",
    color: "#38BDF8",
    descShort: "Who should you watch this with?",
    rangeType: "enum",
    enumValues: [
      { value: "solo", label: "needs processing space" },
      { value: "date", label: "intimate beauty or shared excitement" },
      { value: "friends", label: "rewards shared reaction" },
      { value: "family", label: "emotionally safe for mixed ages" },
    ],
    justification: "The Godfather works solo (you need space to sit with it) or with friends (the performances reward group attention). Not a date movie. Not a family movie.",
    source: "Derived from comfort, warnings, and conversation potential",
    sourceDetail: "Watch context turns abstract mood scores into a practical decision. No other dimension directly addresses the social dimension of film viewing, which research consistently shows shapes the experience as much as the content itself.",
    examples: [
      { movie: "Midsommar", year: 2019, value: "solo", note: "So unsettling that watching alone intensifies the dread" },
      { movie: "The Princess Bride", year: 1987, value: "family", note: "Endlessly quotable adventure that works for every age" },
      { movie: "Borat", year: 2006, value: "friends", note: "Maximum impact from watching others react in real time" },
    ],
    comparison: "Midsommar (solo) is so disturbing that other people in the room become a distraction from processing it. The Princess Bride (family) works for every age and gets better with a crowd quoting along. Borat (friends) is specifically engineered so that half the fun is watching your friends react.",
  },
  {
    key: "vibeSentence",
    value: "\"The slow, inescapable corruption of power wrapped in family love.\"",
    label: "Vibe Sentence",
    color: "#1ED760",
    descShort: "One sentence that captures what the film feels like to watch.",
    rangeType: "freeform",
    justification: "If you read 'The slow, inescapable corruption of power wrapped in family love' and think 'that's tonight,' the system worked.",
    source: "AI-generated synthesis of all dimensions",
    sourceDetail: "The vibe sentence is the most human-readable output in the dataset \u2014 the one dimension a non-technical user can immediately evaluate. It serves as a sanity check on the structured scores and a recommendation hook that no combination of numbers can replicate. Generated last so it can draw on every other dimension.",
    examples: [
      { movie: "La La Land", year: 2016, value: "\"Two dreamers dance through stars, then learn love and ambition don't share a stage.\"", note: "Bittersweet romanticism where music says what characters can't" },
      { movie: "No Country for Old Men", year: 2007, value: "\"Violence moves like weather \u2014 you can't reason with it, only survive it or not.\"", note: "Existential dread disguised as a thriller" },
      { movie: "WALL-E", year: 2008, value: "\"A lonely robot teaches a dying species what it forgot \u2014 that small acts of care are the point.\"", note: "Wordless tenderness in a wasteland" },
    ],
    comparison: "La La Land invites you into bittersweet romance. No Country for Old Men warns you about existential dread. WALL-E promises quiet tenderness in a wasteland. Each sentence works as a self-contained recommendation - read it and you know whether you are in the mood.",
  },
  {
    key: "pacing",
    value: "\"building\"",
    label: "Pacing",
    color: "#8B5CF6",
    descShort: "How the rhythm feels. One of the best predictors of whether someone finishes a movie or bails.",
    rangeType: "enum",
    enumValues: [
      { value: "slow-burn", label: "patience rewarded late" },
      { value: "building", label: "escalating tension" },
      { value: "steady", label: "consistent throughout" },
      { value: "accelerating", label: "gets faster" },
      { value: "relentless", label: "no breathing room" },
      { value: "meandering", label: "deliberately unhurried" },
      { value: "staccato", label: "sharp bursts and pauses" },
      { value: "episodic", label: "discrete segments" },
    ],
    justification: "The Godfather is 'building.' Each scene piles on more threat, more obligation. The tension escalates through structure, not speed.",
    source: "Narrative theory",
    sourceDetail: "Pacing is one of the strongest predictors of whether a viewer will finish a film or abandon it, yet no major recommendation system exposes it. A viewer who wants \"slow-burn\" and gets \"relentless\" will bounce regardless of genre match. This dimension makes that mismatch preventable.",
    examples: [
      { movie: "Whiplash", year: 2014, value: "accelerating", note: "Starts intense and only gets faster until the final cymbal crash" },
      { movie: "The Big Lebowski", year: 1998, value: "meandering", note: "Deliberately ambles through LA with no urgency whatsoever" },
      { movie: "Pulp Fiction", year: 1994, value: "staccato", note: "Shuffled timeline creates bursts of tension between hypnotic dialogue" },
    ],
    comparison: "Whiplash (accelerating) starts intense and only gets faster until the final cymbal crash. The Big Lebowski (meandering) deliberately ambles through LA with no urgency whatsoever. Pulp Fiction (staccato) shuffles its timeline into sharp bursts of tension separated by long, hypnotic dialogue scenes.",
  },
  {
    key: "endingType",
    value: "\"bittersweet\"",
    label: "Ending Type",
    color: "#FF6B6B",
    descShort: "How you feel when the credits hit. This single impression tends to overwrite everything before it.",
    rangeType: "enum",
    enumValues: [
      { value: "triumphant", label: "clear victory, catharsis" },
      { value: "bittersweet", label: "mixed victory and loss" },
      { value: "devastating", label: "crushing, no comfort" },
      { value: "ambiguous", label: "open to interpretation" },
      { value: "twist", label: "reframes everything" },
      { value: "uplifting", label: "earned hope" },
      { value: "unsettling", label: "lingers uncomfortably" },
      { value: "cathartic", label: "emotional release after peril" },
      { value: "pyrrhic", label: "victory that costs everything" },
    ],
    justification: "The Godfather is 'bittersweet.' Michael won the war, the empire, the business. Lost Kay, his soul, everything that mattered. The door closes on both.",
    source: "Narrative theory",
    sourceDetail: "Research on peak-end effects shows the final emotional impression often overwrites the experience that preceded it. This dimension captures that critical last impression \u2014 suggesting a devastating ending to someone seeking comfort is a failure mode worth preventing.",
    examples: [
      { movie: "Toy Story 3", year: 2010, value: "cathartic", note: "Earned emotional release after sustained peril" },
      { movie: "Se7en", year: 1995, value: "devastating", note: "The villain wins, the hero breaks, the box is already open" },
      { movie: "The Dark Knight", year: 2008, value: "pyrrhic", note: "Gotham is saved but Batman becomes a fugitive" },
    ],
    comparison: "Toy Story 3 (cathartic) puts you through genuine peril before earning its emotional release. Se7en (devastating) lets the villain win so completely that the hero breaks. The Dark Knight (pyrrhic) saves Gotham but destroys Batman's reputation - a victory that costs everything it was meant to protect.",
  },
  {
    key: "comfortLevel",
    value: "0.3",
    label: "Comfort Level",
    color: "#FBBF24",
    descShort: "How emotionally safe is this to watch?",
    rangeType: "scale",
    rangeMin: "0.0",
    rangeMax: "1.0",
    rangeMinLabel: "extremely distressing",
    rangeMaxLabel: "completely safe, pure comfort",
    justification: "The Godfather scores 0.3. Graphic violence, sustained moral unease, no comforting resolution. Watch it when you're feeling solid.",
    source: "Zillmann\u2019s Mood Management Theory (1988)",
    sourceUrl: "https://doi.org/10.4324/9780203809464",
    sourceDetail: "People systematically use media to regulate their emotional states, and a recommendation system that ignores current mood risks genuine harm. This dimension enables comfort-aware filtering: if a user signals they need something safe, the system can respect that without requiring them to explain why.",
    examples: [
      { movie: "Paddington 2", year: 2017, value: "0.95", note: "Possibly the most emotionally safe film ever made" },
      { movie: "Irr\u00e9versible", year: 2002, value: "0.02", note: "Deliberately structured to maximize psychological distress" },
      { movie: "Spirited Away", year: 2001, value: "0.6", note: "Magical and gentle but has genuinely eerie moments" },
    ],
    comparison: "Paddington 2 (0.95) is probably the safest film in existence - pure warmth with zero emotional risk. Irreversible (0.02) is deliberately structured to maximize psychological distress. Spirited Away (0.6) is mostly gentle and magical but contains moments of genuine eeriness that keep it from the top of the comfort scale.",
  },
  {
    key: "emotionalSafetyWarnings",
    value: "[]",
    label: "Safety Warnings",
    color: "#F97316",
    descShort: "Things that might catch you off guard. Informed consent, not censorship.",
    rangeType: "freeform",
    justification: "The Godfather has nothing flagged. The violence is graphic but expected. Nothing ambushes you.",
    source: "Community-driven content warning databases + AI classification",
    sourceDetail: "Some viewers have trauma responses to specific content \u2014 child harm, self-harm, sexual violence \u2014 and need advance notice that no spoiler-free review provides. No other dimension addresses viewer safety at this granular level. Cross-referenced with community databases like DoesTheDogDie.",
    examples: [
      { movie: "Grave of the Fireflies", year: 1988, value: "child death, starvation, war trauma", note: "Animated devastation that reduces adults to inconsolable grief" },
      { movie: "The Lion King", year: 1994, value: "parent death", note: "One scene has traumatized generations and still works every time" },
      { movie: "A Clockwork Orange", year: 1971, value: "sexual violence, psychological torture", note: "Kubrick's unflinching look at ultraviolence" },
    ],
    comparison: "Grave of the Fireflies (child death, starvation, war trauma) can devastate an unprepared viewer. The Lion King has just one scene of parent death but it has marked generations of children. A Clockwork Orange (sexual violence, psychological torture) is methodically transgressive from start to finish - three very different reasons a viewer might need advance notice.",
  },
  {
    key: "conversationPotential",
    value: "0.9",
    label: "Conversation",
    color: "#F97316",
    descShort: "Will you talk about it after?",
    rangeType: "scale",
    rangeMin: "0.0",
    rangeMax: "1.0",
    rangeMinLabel: "nothing to discuss",
    rangeMaxLabel: "generates hours of conversation",
    justification: "The Godfather scores 0.9. It raises questions about power, family, and morality that it never answers. People argue about this film from every possible angle.",
    source: "Thematic complexity + moral ambiguity analysis",
    sourceDetail: "Some viewers specifically seek films that give them something to talk about, while others want something they can enjoy and move on from. No other dimension addresses that need. Derived from thematic complexity, moral ambiguity, cultural relevance, and interpretive openness.",
    examples: [
      { movie: "Mulholland Drive", year: 2001, value: "0.95", note: "People have debated what happened for two decades" },
      { movie: "Transformers: Age of Extinction", year: 2014, value: "0.05", note: "Spectacle without substance \u2014 nothing to discuss" },
      { movie: "Get Out", year: 2017, value: "0.85", note: "Every rewatch reveals new layers of social commentary" },
    ],
    comparison: "Mulholland Drive (0.95) has been debated for over two decades with no consensus. Transformers: Age of Extinction (0.05) delivers spectacle that evaporates the moment it ends. Get Out (0.85) rewards every rewatch with new layers of social commentary hiding in plain sight.",
  },
  {
    key: "reasoning",
    value: "\"The Godfather trades hedonic pleasure for profound eudaimonic weight, absorbing the viewer into a moral universe where loyalty and corruption are inseparable.\"",
    label: "Reasoning",
    color: "#1ED760",
    descShort: "The classifier's own explanation for every score. Read it, disagree, submit a correction.",
    rangeType: "freeform",
    justification: "For The Godfather, the reasoning walks through the hedonic vs eudaimonic trade-off, defends the oedipus arc call, and explains high absorption despite moderate arousal. If a score looks wrong, start here.",
    source: "Chain-of-thought reasoning",
    sourceDetail: "Without reasoning, a score is just a number. With it, every classification decision can be inspected, challenged, and corrected. Essential for any researcher or developer who needs to trust the data \u2014 or explain to their own users why a particular film was recommended.",
    examples: [],
  },
];


// ââ Dimension chips (derived from DATA_FIELDS) ââ
export const DIMENSIONS = DATA_FIELDS.map((f, i) => ({
  label: f.label,
  color: f.color,
  idx: i,
}));

// ââ FAQ ââ
export const FAQ_ITEMS = [
  {
    q: "How does mood classification work?",
    a: "We feed movie data from multiple sources (TMDB, Wikipedia, Rotten Tomatoes, MovieLens) into an AI classifier that scores each film across 18 psychological dimensions. The classifier explains its reasoning for every score, making the process transparent and auditable.",
  },
  {
    q: "Why not just use genres?",
    a: 'Genres tell you the category, not the feeling. Two "dramas" can leave you in opposite emotional states. Our 18 dimensions capture what genres miss: intensity, empowerment, comfort, pacing, and more.',
  },
  {
    q: "Is the dataset free to use?",
    a: "Yes. CC-BY-NC-4.0 \u2014 free for research, personal projects, and non-commercial use.",
  },
  {
    q: "How accurate are the mood scores?",
    a: "The classifier agrees with human raters about 85% of the time on core dimensions. Edge cases exist \u2014 mood is subjective. That\u2019s why we include the reasoning field: you can read the logic and disagree intelligently.",
  },
  {
    q: "Can I contribute or correct data?",
    a: "Absolutely. The project is on GitHub. Submit corrections as issues or PRs.",
  },
];

// ââ Game modes ââ
export const GAME_MODES = [
  { title: "Mooduel", desc: "Three rounds of vibe picks, then a tournament. Eight movies enter, one wins.", color: "#E91E8C" },
  { title: "Blind Taste Test", desc: "Five vibe sentences. No titles, no posters. Pick the mood, see the movie.", color: "#8B5CF6" },
  { title: "Mood Roulette", desc: "Spin three reels \u2014 emotional arc, context, wild card. See what lands.", color: "#1ED760" },
  { title: "Mood Mirror", desc: "Twelve rapid choices map your emotional fingerprint to matching films.", color: "#38BDF8" },
];

// ââ External links ââ
export const LINKS = [
  { label: "GitHub", href: "https://github.com/Stormbane/mooduel", color: "#fff" },
  { label: "HuggingFace Dataset", href: "#", color: "#FBBF24" },
  { label: "Explore Movies", href: "/explore", color: "#1ED760" },
  { label: "Dashboard", href: "/dashboard", color: "#38BDF8" },
];
