# Deep Dive: Mood Science for Movie Classification

Compiled 2026-03-14. Deep web research on psychological models, movie emotion
datasets, classification feasibility, and existing work. Complements the main
`mood-science-research.md` file.

---

## 1. Zillmann's Mood Management Theory (MMT) — Full Detail

### The Four Properties of Media Content

Zillmann (1988) proposed that media messages can be characterized along four
dimensions that determine their mood-altering capacity. These are properties of
the **content itself**, not the viewer:

**1. Excitatory Potential**
The capacity of media to increase or decrease physiological arousal. Fast-paced
action has high excitatory potential; slow nature footage has low. This is the
most straightforward dimension — it maps directly to the arousal axis.

Key prediction: People seek **excitatory homeostasis**. Bored/understimulated
viewers choose high-excitatory content; stressed/overstimulated viewers choose
low-excitatory (calming) content. The selection is *excitationally opposite* to
the current state.

**2. Absorption Potential**
The degree to which content captures and holds attention, thereby disrupting
ongoing cognitive processes. A visually complex newscast with multiple display
elements has greater absorption potential than a talking-head format.

Critical mechanism: Absorption potential serves mood regulation through
**distraction**. A person in a negative mood benefits from highly absorbing
content because it interrupts rumination. Someone in a positive mood avoids
highly absorbing content that might disrupt their pleasant state.

This is NOT the same as excitatory potential, though they overlap. A quiet,
slow-paced puzzle film (e.g., *Primer*) has low excitatory potential but high
absorption potential. A loud, repetitive action scene has high excitatory
potential but potentially low absorption potential if it becomes predictable.

**3. Semantic Affinity**
The thematic/semantic similarity between media content and the viewer's current
emotional situation. A person grieving a breakup watching a movie about a
breakup = high semantic affinity.

Key prediction: People in negative states **avoid** content with high semantic
affinity to their distress, because such content sustains or intensifies
negative mood. People in positive states may seek semantically congruent content
to maintain their mood.

Counter-hedonic exception: Some people deliberately seek high-semantic-affinity
content during negative states (e.g., watching sad movies while sad) for
catharsis, emotional validation, or controlled emotional processing.

**4. Hedonic Valence**
Whether the content produces positive (pleasant) or negative (unpleasant)
emotional effects. Comedy has positive hedonic valence; graphic war footage has
negative hedonic valence.

Key prediction: People in negative states preferentially select content with
positive hedonic valence. People in positive states select content that
maintains positive valence (avoiding negative content that would disrupt it).

### The Core MMT Prediction (Zillmann's Formulation)

"The hedonistic objective is best served by selective exposure to material that:
(a) is excitationally opposite to prevailing states associated with noxiously
experienced hypo- or hyperarousal,
(b) has positive hedonic value above that of prevailing states, and
(c) in hedonically negative states, has little or no semantic affinity with the
prevailing states."

### Is MMT Just Valence + Arousal?

**No.** While excitatory potential maps to arousal and hedonic valence maps to
valence, the other two dimensions are distinct:

- **Absorption potential** is a cognitive/attentional dimension — how much the
  content monopolizes mental resources. It overlaps with but is not reducible to
  arousal. It maps more closely to **narrative engagement** or what Green & Brock
  call "transportation."

- **Semantic affinity** is a relational dimension — it depends on the
  *interaction* between content and viewer state. The same movie has different
  semantic affinity for different viewers depending on their current life
  situation. This cannot be pre-computed as a fixed property of the movie.

### Experimental Evidence

Bryant & Zillmann (1984): Induced stress via tedious tasks. Stressed
participants selected more soothing TV programs; bored subjects chose exciting
content. Validated the arousal-regulation predictions.

### Extensions and Criticisms

- **Individual differences**: Personality traits (especially sensation-seeking,
  neuroticism) moderate MMT predictions. High sensation-seekers prefer
  high-excitatory content even when stressed.
- **Eudaimonic motivation**: Oliver & Bartsch (2010) showed people don't only
  seek hedonic pleasure from media — they also seek **meaning** and
  **appreciation**. Sad films can be deeply satisfying not because they improve
  mood but because they provide meaningful experiences.
- **Psychologically rich experiences**: Wirz & Eden (2025, PLOS ONE) identified
  a **third type** of entertainment experience beyond hedonic (pleasurable) and
  eudaimonic (meaningful): **psychologically rich** experiences characterized by
  variety, novelty, and interest. This may have been previously conflated with
  eudaimonic measures.

### Sources
- Zillmann (1988), "Mood Management Through Communication Choices"
- Zillmann (2000), "Mood Management in the Context of Selective Exposure Theory"
- Bryant & Zillmann (1984), experimental study
- Reinecke (2017), "Mood Management Theory" in Wiley-Blackwell encyclopedia
- Oliver & Bartsch (2010), "Appreciation as audience response"
- Wirz & Eden (2025), "Beyond pleasurable and meaningful" (PLOS ONE)

---

## 2. Russell's Circumplex Model of Affect — Criticisms & Sufficiency

### The Model

Russell (1980) derived the circumplex empirically by having participants sort 28
emotion words by similarity. Multidimensional scaling recovered two orthogonal
dimensions:

- **Valence** (pleasure-displeasure): horizontal axis
- **Arousal** (activation-deactivation): vertical axis

Emotions are arranged in a circular order at 45-degree intervals:
pleasure (0°) → excitement (45°) → arousal (90°) → distress (135°) →
displeasure (180°) → depression (225°) → sleepiness (270°) → relaxation (315°)

### The Distinction: Core Affect vs. Emotion Episodes

Russell distinguishes:
- **Core affect**: The ongoing, background feeling state. Always present, always
  somewhere in valence-arousal space. Diffuse, not about anything specific.
- **Prototypical emotion episodes**: Discrete events with specific triggers,
  behavioral components, cognitive appraisals, and physiological signatures.

For movie selection, **core affect** is what matters — it's the ambient state
that determines what someone is "in the mood for."

### Criticisms and Limitations

**1. Ellipse, Not Circle**
Kuppens et al. (2021, Personality and Individual Differences) found that the
arousal dimension was systematically associated with discrepancies from
theoretical predictions, resulting in an **ellipse structure** rather than a
true circumplex. The valence axis dominates.

**2. Poor Arousal Differentiation**
An affective circumplex with valence focus demonstrates poor differentiation
along the arousal axis. Similarly valenced emotions (anxiety vs. sadness, or
happiness vs. contentedness) are hard to distinguish.

**3. The Third Dimension Question**
Multiple proposals for a third dimension exist:
- **Dominance/control** (Mehrabian & Russell's PAD model, 1974): How much the
  person feels in control. Anger is high-dominance; fear is low-dominance. Both
  are negative-valence, high-arousal — V/A alone can't distinguish them.
- **Depth of experience**: How profound or superficial the emotional state is.
- **Locus of causation**: Whether the emotion is self-caused or externally caused.

The PAD (Pleasure-Arousal-Dominance) model adds dominance as a formal third axis.
The EMDB database uses all three (valence, arousal, dominance) in its ratings.

**4. Subjectivity**
The model focuses on subjective experience — emotions may not be placed at the
same coordinates for all people. Individual and cultural differences exist.

**5. Two Dimensions for Movies?**
For **movie classification**, two dimensions are likely insufficient:
- V/A cannot distinguish a *thoughtful* sad drama from a *devastating* one
- V/A cannot capture whether a movie is *intellectually engaging* vs. *purely visceral*
- V/A cannot represent narrative complexity or emotional arc
- V/A works well for **music** (Spotify uses it successfully) but movies are
  more complex stimuli with cognitive, narrative, and social dimensions

**However:** Despite 45+ years of attempts to add dimensions, "study after study
has consistently recovered the pleasure and arousal dimensions" as the primary
structure of affect. The two dimensions may be *sufficient* for **core affect**
even if they're insufficient for describing the full **experience** of a movie.

### Sources
- Russell (1980), "A Circumplex Model of Affect"
- Posner, Russell & Peterson (2005), PMC2367156
- Kuppens et al. (2021), "Ellipse rather than a circumplex"
- Mehrabian & Russell (1974), PAD model

---

## 3. Other Psychological Models for Media/Movie Mood

### 3a. PANAS (Positive and Negative Affect Schedule)

Watson, Clark & Tellegen (1988) developed PANAS as a self-report questionnaire
with two 10-item scales measuring positive affect (PA) and negative affect (NA),
each rated on a 5-point scale.

The 10 positive items: interested, excited, strong, enthusiastic, proud, alert,
inspired, determined, attentive, active.

The 10 negative items: distressed, upset, guilty, scared, hostile, irritable,
ashamed, nervous, jittery, afraid.

**PANAS-X** (Watson & Clark, 1994) expands to 60 items measuring 11 lower-order
emotional states with 8 temporal instructions (from "right now" to "in general").

**Relevance to movies**: PANAS captures mood *before* viewing (to predict
selection) and *after* viewing (to measure impact). It's more granular than V/A
for tracking mood changes but is a self-report instrument, not a classification
scheme for content.

### 3b. Discrete Emotion Models

**Ekman (1992)**: Six basic emotions — anger, disgust, fear, happiness, sadness,
surprise. Cross-culturally recognizable from facial expressions. Used as the
basis for facial emotion recognition in movie emotion systems. Ekman was a
scientific advisor on Pixar's *Inside Out*.

**Plutchik (1980)**: Eight primary emotions arranged in a wheel — joy, trust,
fear, surprise, sadness, disgust, anger, anticipation. Each has three intensity
levels (e.g., annoyance → anger → rage). Adjacent emotions combine to form
"dyads" (e.g., joy + trust = love; fear + surprise = awe).

**For movie classification**: Discrete models are more intuitive for users
("this movie makes you feel fear and surprise") but lose the dimensional
relationships. Many movie emotion systems use a **hybrid** approach —
dimensional V/A for the underlying model with discrete emotion labels for the
user-facing display.

### 3c. Appraisal Theories

**Cognitive appraisal theory** (Lazarus, Scherer): Emotions arise from how we
*evaluate* situations, not from the situations themselves. Different viewers
have different emotional reactions to the same film scene because each person's
interpretation influences their feelings.

**For movies**: Appraising a film clip as complex and comprehensible predicted
**interest**; appraising it as complex and incomprehensible predicted
**confusion**. Film expertise moderated this — experts found films more
interesting and less confusing, and their interest was more strongly predicted
by complexity (ResearchGate: "Finding Movies Interesting").

This has implications for classification: a movie's emotional effect depends
partly on the **viewer's expertise and interpretive capacity**, not just on
properties of the film itself.

### 3d. Flow Theory (Csikszentmihalyi)

Flow requires: clear goals, immediate feedback, challenge-skill balance,
concentration, loss of self-consciousness, time distortion, intrinsic reward.

**Relevance to movie watching**: Movies can induce flow-like states, but
"transportation" (Green & Brock) is the more specific concept. Flow is about
active engagement with challenging tasks; movie watching is more passive but
can achieve similar absorption.

**For classification**: Flow/absorption potential could be a useful axis —
some movies demand active cognitive engagement (puzzle films, complex
narratives), while others are passive experiences. This maps somewhat to
Zillmann's absorption potential.

### 3e. Transportation Theory (Green & Brock, 2000)

Transportation is "an experience of cognitive, emotional, and imagery
involvement in a narrative" — the feeling of being "lost" in a story.

Components: cognitive attention, emotional engagement, mental imagery.

Key findings:
- Transported viewers show greater story-consistent beliefs and attitudes
- Transportation is distinct from flow (flow is broader, not narrative-specific)
  and from presence (presence is about spatial immersion, not narrative)
- Transportation predicts enjoyment and persuasion independently of content quality

**For movie classification**: Transportation potential is highly relevant as a
classification dimension. Some movies are built to transport (immersive world-
building, strong narrative pull); others are deliberately distancing (Brechtian,
meta-textual). An LLM could potentially estimate this from plot descriptions
and reviews.

### 3f. Movie-Specific Mood Taxonomies

**Tarvainen & Laaksonen (2018)**: Studied film mood using three dimensions —
hedonic tone, energetic arousal, and tense arousal. Found that viewers could
directly assess film mood in these terms and that sound-based scene
classification brought out differences in mood ratings.

**"As Movies Go By" (Springer, 2025)**: Built a system using Russell's V/A
circumplex as the central model, with discrete Ekman emotions overlaid. Users
can search by drawing emotional trajectories and highlights. Uses multimodal
input (EEG, ECG, EDA sensors; webcam facial expression recognition).

**Film Tone Theory**: Recent theoretical work proposes that **tone** is not a
surface-level emotional property but "an ideological structure emerging from
value fields." Mood is an affective layer within the same perceptual field.
Genre is the externalization of tone — "the crystallization of recurring
value-laden tonal structures into recognizable cinematic categories."

### Sources
- Watson, Clark & Tellegen (1988), PANAS
- Ekman (1992), basic emotions
- Plutchik (1980), wheel of emotions
- Green & Brock (2000, 2002), transportation theory
- Csikszentmihalyi (1990), flow theory
- Tarvainen & Laaksonen (2018), film mood determinants
- Bartsch et al. (2008), meta-emotions in entertainment

---

## 4. Useful Dimensions for Movie Classification

Beyond valence and arousal, research suggests these additional axes would
meaningfully differentiate movies for recommendation:

### 4a. Absorption / Transportation Potential
**What it measures**: How much the movie pulls you in and holds your attention.
How "lost" you get in it.

**Can an LLM estimate this?** Likely yes, from:
- Plot synopsis complexity and world-building indicators
- Review language (mentions of "couldn't look away," "immersive," "gripping")
- Genre conventions (fantasy/sci-fi with world-building = high)
- Runtime and pacing indicators

**Corresponds to**: Zillmann's absorption potential, Green & Brock's
transportation, partially Csikszentmihalyi's flow.

### 4b. Cognitive Demand / Complexity
**What it measures**: How much mental effort the movie requires. Puzzle films,
nonlinear narratives, ambiguous endings vs. straightforward stories.

**Can an LLM estimate this?** Yes:
- Plot synopsis indicators of nonlinear structure, unreliable narrators
- Review mentions of "confusing," "thought-provoking," "requires multiple viewings"
- MovieCORE (2025, arxiv) uses parse tree depth and Bloom's taxonomy to assess
  cognitive complexity of movie understanding tasks

**Research basis**: Silvia's complexity-interest-confusion framework; Berlyne's
collative variables; narrative complexity research showing trend toward
puzzle-like mainstream narratives.

### 4c. Emotional Arc Shape
**What it measures**: Not just what emotion a movie evokes, but the *trajectory*
of emotional experience over time.

Reagan et al. (2016) identified **six fundamental emotional arc shapes** from
analysis of 1,737 stories:
1. **Rags to riches** (steady rise)
2. **Tragedy** (steady fall)
3. **Man in a hole** (fall then rise) — **highest box office correlation**
4. **Icarus** (rise then fall)
5. **Cinderella** (rise-fall-rise)
6. **Oedipus** (fall-rise-fall)

Chu & Roy (2017, ICDM) applied audio-visual sentiment analysis to compute
emotional arcs for movies specifically, using deep CNNs for audio and visual
analysis. They confirmed the six-shape taxonomy applies to films.

Del Vecchio et al. (2018, SSRN) found the "Man in a Hole" arc correlated with
the highest box office performance.

**Can an LLM estimate this?** Probably, from plot synopses. A synopsis describes
the narrative trajectory, and an LLM can identify which arc shape it follows.

### 4d. Catharsis Potential
**What it measures**: Whether the movie provides emotional release/purging.

Aristotle's original concept: viewing tragedy produces catharsis (katharsis) —
emotional purification through pity and fear. Modern research (2020-2025) finds
catharsis is **real but conditional** — it works when stories inspire empathy
and understanding, not just emotional intensity. Evidence does NOT consistently
support the idea that violent/tragic content reduces aggression.

**Can an LLM estimate this?** Partially. Reviews mentioning feeling "cleansed,"
"lighter," "had a good cry" indicate cathartic potential. Plot structure
(tragedy followed by resolution) also indicates it.

### 4e. Hedonic vs. Eudaimonic vs. Psychologically Rich

Oliver & Bartsch (2010) established that entertainment serves two purposes:
- **Hedonic**: Fun, pleasure, positive affect
- **Eudaimonic**: Meaning, appreciation, mixed affect, reflection

Wirz & Eden (2025) added a third:
- **Psychologically rich**: Variety, novelty, interest, perspective-broadening

These three types predict **different well-being outcomes** and could serve as
a useful classification axis. A movie can be high on one, two, or all three.

### 4f. Social vs. Solitary Suitability

Research (PLOS ONE, 2019) shows physiological responses differ between
watching alone and in groups — vagal flexibility mediates the effect of
co-viewing on emotional arousal. Some movies are "better" as shared social
experiences (comedies, horror); others benefit from solitary focused viewing
(slow dramas, art films).

**Can an LLM estimate this?** Probably, from genre, tone, and cultural
conventions. Harder to validate empirically.

### 4g. Semantic Affinity (Viewer-Dependent)

This is Zillmann's dimension but it's **relational**, not intrinsic to the
movie. The same movie has different semantic affinity depending on the viewer's
current life situation. This cannot be pre-computed as a movie property but
could be estimated at recommendation time if the system knows something about
the viewer's context.

### Proposed Practical Dimensions for Classification

For a movie mood classification system, the most feasible and useful dimensions
(beyond genre) would be:

| Dimension | Estimable by LLM? | Source |
|-----------|-------------------|--------|
| Valence (pleasure-displeasure) | Yes, from synopsis + reviews | Russell (1980) |
| Arousal (activation-deactivation) | Yes, from synopsis + reviews | Russell (1980) |
| Absorption potential (transportation) | Yes, from synopsis + reviews | Zillmann (1988), Green & Brock (2000) |
| Cognitive demand | Yes, from synopsis + reviews | Silvia (2005), Berlyne (1971) |
| Emotional arc shape (1 of 6) | Yes, from synopsis | Reagan et al. (2016) |
| Hedonic/Eudaimonic/Rich type | Yes, from synopsis + reviews | Oliver & Bartsch (2010), Wirz & Eden (2025) |
| Catharsis potential | Partially, from reviews | Aristotle; modern catharsis research |
| Social viewing suitability | Roughly, from genre/tone | Social viewing research |

---

## 5. Scale Feasibility

### TMDB Database Size

- **Total movies in TMDB**: ~1,300,000 (as of 2025 FAQ page; crossed 1M mark in 2024)
- **Kaggle full dataset**: 1,000,000 movies (asaniczka dataset, 249 MB)
- **Kaggle TMDB+IMDb merged**: 960,000+ movies (alanvourch dataset, 309 MB, daily updates)

### How Many Are "Relevant"?

No published statistics on exact counts, but reasonable estimates:
- Movies with a non-empty overview: likely ~500K-600K
- Movies with vote_count > 10: likely ~100K-150K
- Movies with vote_count > 100 (meaningfully rated): likely ~30K-50K
- Movies with vote_count > 1000 (well-known): likely ~5K-10K
- Movies that are "watchable" (available on streaming, not obscure): likely ~50K-100K

**For a v1 classifier**: Start with movies that have (a) an overview, (b)
vote_count >= 50, and (c) are in a language the user speaks. This is probably
~50K-80K movies.

### Cost Estimation

Using Claude Haiku 4.5 ($1/M input tokens, $5/M output tokens):

**Per-movie classification prompt** (estimated):
- System prompt with classification schema: ~500 tokens (cached after first call)
- Movie overview + metadata input: ~200-400 tokens
- Structured output (scores on 6-8 dimensions): ~100-200 tokens

Estimated cost per movie: ~$0.001-0.002 (input) + ~$0.0005-0.001 (output)
= **~$0.001-0.003 per movie**

With prompt caching (system prompt cached):
- Cache write: 1.25x on first call
- Cache hits: 0.1x input cost for system prompt on subsequent calls
- Effective cost drops to ~$0.0005-0.002 per movie

**Scale estimates:**

| Scope | Movies | Est. Cost | Time (at 1000 RPM) |
|-------|--------|-----------|---------------------|
| Top-rated core | 5,000 | $5-15 | 5 min |
| Well-known films | 30,000 | $30-90 | 30 min |
| All rated films | 100,000 | $100-300 | 1.7 hrs |
| Full viable catalog | 500,000 | $500-1,500 | 8.3 hrs |

### Could This Be Open Data?

Yes. Pre-computed mood/emotion classifications for movies could be distributed
as open data under creative commons. The classifications are derived
observations, not copyrighted content. The main concerns:
- TMDB's terms of service require attribution
- Refresh cadence: new movies are added daily
- Quality validation: need human spot-checks on a sample

### Existing Movie Mood/Emotion Datasets

**1. MovieLens Tag Genome** (GroupLens)
- 10.5 million tag-relevance scores for 9,734 movies across 1,084 tags
- Tags include mood-related terms like "atmospheric," "dark," "feel-good"
- Continuous 0-1 relevance scores
- Freely available for research
- **Most relevant existing dataset for this use case**

**2. EMDB (Emotional Movie Database)**
- 60-70 film clips, 40 seconds each
- Rated on valence, arousal, and dominance (SAM scales)
- 5 emotion categories: social exclusion, social inclusion, unpleasant
  landscapes, extreme sports, neutral
- Lab-validated with 245 participants
- Free for scientific research upon request
- Too small for production use but good for validation

**3. LIRIS-ACCEDE**
- 9,800 video excerpts from 160 movies (Creative Commons)
- Annotated with valence and arousal
- Can be freely redistributed
- Large enough for training models; clips not full movies

**4. VEATIC**
- 124 clips from Hollywood movies, documentaries, home videos
- Continuous frame-level valence and arousal annotations
- First large context-aware video emotion dataset

**5. AFEW-VA**
- 600 clips from feature films
- Per-frame valence and arousal annotations + 68 facial landmarks

**6. IMDB Sentiment Datasets**
- Stanford Large Movie Review Dataset: 50K reviews, binary sentiment
- Kaggle Movie Review Sentiment: multi-class sentiment
- These are REVIEW sentiment, not MOVIE mood — they measure whether
  reviewers liked the movie, not what emotional experience it provides

**7. NRC Emotion Lexicon**
- 14,000+ words mapped to 8 emotions + 2 sentiments
- Not movie-specific but can be applied to synopses/reviews
- Free for research; nominal commercial license

---

## 6. Existing Work — Has Anyone Built This?

### Academic Systems

**1. "As Movies Go By" (Piçarra et al., 2022-2025, Springer)**
The most comprehensive academic system. Uses Russell's V/A circumplex as the
core model with Ekman's discrete emotions overlaid. Supports multimodal search:
users can draw emotional trajectories, express emotions via webcam, or use
EEG/ECG/EDA sensors. Visualizes emotional arcs over time within films.

**2. E-MRS: Emotion-based Movie Recommender System (Ho et al.)**
Uses fuzzy emotion features for movie recommendation. Employs a Mamdani fuzzy
model to extract classification rules from emotions detected in reviews.

**3. Fuzzy Emotion Movie Recommender (Springer, 2020)**
Framework addressing "inherent vagueness in emotional features" by using fuzzy
classification. Maps emotional features (love, joy, surprise, anger, sadness,
fear) from reviews to movie recommendations.

**4. Mood-Aware Movie Recommendations (ScienceDirect, 2010)**
Studies how user mood impacts movie appraisal across genres. Uses affective
user profiles where each rating is associated with the affective state felt
at the time. Found mood significantly affects genre preferences.

**5. Audio-Visual Emotional Arcs (Chu & Roy, 2017, ICDM/ICCV)**
Used deep CNNs for audio and visual sentiment analysis to compute emotional
arcs of movies. Confirmed six fundamental arc shapes. Introduced a Spotify
dataset of 600K+ audio samples for audio emotion classification.

### Scoping Review: State of the Field

**Piçarra (2022)** conducted a scoping review of 83 papers (2000-2021) on
"Searching, Navigating, and Recommending Movies through Emotions":

Key findings:
- 22 case studies, 34 empirical studies, 26 proof of concept, 1 theoretical
- User transactions (ratings, tags) were the preferred data source
- Both categorical and dimensional emotion models were used; 9 papers combined both
- **References were frequently dated** — researchers may not be aware of current
  theoretical developments
- 12 papers didn't even mention which emotion model they used
- 61 distinct emotion-related words were identified across papers

### Industry Systems

- **Spotify**: The most successful mood-based recommendation system. Uses
  valence (0-1) and energy (0-1) for every track. Key insight: arousal/energy
  is easier to detect from audio features than valence.
- **Netflix**: Uses extensive tagging with mood-adjacent categories ("feel-good,"
  "dark," "mind-bending") but doesn't publish the underlying model.
- **Letterboxd**: Community-driven mood tags but unstructured.
- **Mubi**: Curated collections with mood themes but no systematic classification.

### What's Missing

No one has built a **comprehensive, open, LLM-powered movie mood classification
at scale**. The key gaps:
1. Academic systems use small datasets (hundreds of clips, not thousands of movies)
2. Industry systems are proprietary
3. No system combines dimensional (V/A) with the richer Zillmann dimensions
4. No system uses LLMs for scalable classification from synopses + reviews
5. The MovieLens Tag Genome is the closest to a large-scale mood mapping, but
   its 1,084 tags are not organized along psychological dimensions

---

## 7. Synthesis: Recommendations for Movie Picker

### Proposed Classification Schema

Based on this research, a practical movie mood classification should include:

**Core Dimensions (continuous 0-1 scales):**
1. **Valence**: Pleasure to displeasure
2. **Arousal**: Activation to deactivation
3. **Absorption**: How much it pulls you in (transportation potential)
4. **Cognitive demand**: How much thinking it requires

**Categorical Dimensions:**
5. **Emotional arc**: One of 6 shapes (rags-to-riches, tragedy, man-in-hole,
   Icarus, Cinderella, Oedipus)
6. **Experience type**: Hedonic / Eudaimonic / Psychologically Rich (can be
   multi-label)
7. **Dominant emotions**: Top 2-3 from Plutchik's 8 (joy, trust, fear,
   surprise, sadness, disgust, anger, anticipation)

**Optional/Experimental:**
8. **Catharsis potential**: Low / Medium / High
9. **Social viewing**: Solo / Either / Group

### Why This Schema

- Valence + Arousal: 45 years of replication, works as base coordinates
- Absorption: Addresses Zillmann's key insight that distraction is therapeutic
- Cognitive demand: Critical differentiator that V/A alone misses
- Emotional arc: Proven in data-driven story research, estimable from synopsis
- Experience type: Captures the hedonic/eudaimonic distinction that explains
  why people "enjoy" sad movies
- Dominant emotions: Bridges dimensional and categorical models for user-facing
  display

### Feasibility Assessment

- **LLM classification of synopsis + metadata**: Highly feasible. Synopsis
  provides narrative arc; metadata provides genre, runtime, rating.
- **Cost for 50K movies**: ~$50-150 with Haiku 4.5
- **Validation**: Use MovieLens Tag Genome relevance scores as ground truth
  for tags like "atmospheric," "dark," "feel-good," etc.
- **Open data distribution**: Legally feasible with TMDB attribution

---

## Full Source List (New Sources from This Research)

### Mood Management Theory
- Zillmann (1988), "Mood Management Through Communication Choices"
- Zillmann (2000), "Mood Management in the Context of Selective Exposure Theory"
- Bryant & Zillmann (1984), mood and TV selection
- Reinecke (2017), Wiley-Blackwell encyclopedia entry on MMT

### Circumplex Model & Critiques
- Russell (1980), "A Circumplex Model of Affect"
- Mehrabian & Russell (1974), PAD model (Pleasure-Arousal-Dominance)
- Kuppens et al. (2021), "Ellipse rather than a circumplex" (Personality & Indiv. Diff.)
- Posner, Russell & Peterson (2005), PMC2367156

### Discrete Emotions
- Ekman (1992), six basic emotions
- Plutchik (1980), wheel of emotions

### Entertainment Experience
- Oliver & Bartsch (2010), "Appreciation as audience response"
- Wirz & Eden (2025), "Beyond pleasurable and meaningful" (PLOS ONE, PMC11801586)
- Bartsch et al. (2008), meta-emotions in entertainment

### Narrative & Transportation
- Green & Brock (2000, 2002), transportation theory
- Green & Appel (2024), "Narrative Transportation" advances preprint
- Csikszentmihalyi (1990), flow theory

### Emotional Arcs
- Reagan et al. (2016), "The emotional arcs of stories" (EPJ Data Science)
- Chu & Roy (2017), "Audio-Visual Sentiment Analysis for Learning Emotional Arcs in Movies" (ICDM/ICCV)
- Del Vecchio et al. (2018), "The Data Science of Hollywood" (SSRN 3198315)

### Film Mood
- Tarvainen & Laaksonen (2018), "Film Mood and Its Quantitative Determinants"
- Piçarra et al. (2022), scoping review, Wiley HBET 10.1155/2022/7831013
- Piçarra et al. (2025), "As Movies Go By" (SN Computer Science)

### Appraisal & Complexity
- Silvia (2005), complexity-interest-confusion
- MovieCORE (2025, arxiv 2508.19026), cognitive reasoning in movies

### Datasets
- MovieLens Tag Genome 2021: 10.5M scores, 9,734 movies, 1,084 tags (GroupLens)
- EMDB: 60-70 clips, V/A/D ratings (ResearchSquare rs-6401734)
- LIRIS-ACCEDE: 9,800 excerpts, V/A annotations (liris.cnrs.fr)
- VEATIC: 124 clips, continuous V/A (veatic.github.io)
- AFEW-VA: 600 clips, per-frame V/A (ibug.doc.ic.ac.uk)
- NRC Emotion Lexicon: 14K+ words, 8 emotions + 2 sentiments (saifmohammad.com)
- TMDB Full Dataset: 1M+ movies (Kaggle, asaniczka)
- TMDB+IMDb Merged: 960K+ movies (Kaggle, alanvourch)
- Stanford IMDB Sentiment: 50K reviews (ai.stanford.edu/~amaas/data/sentiment/)

### Catharsis
- Aristotle, Poetics (katharsis)
- Modern catharsis research (2020-2025): conditional effectiveness

### Social Viewing
- PLOS ONE (2019), "Sharing the filmic experience" (10.1371/journal.pone.0223259)

### Cost
- Anthropic Claude Haiku 4.5 pricing: $1/M input, $5/M output tokens
