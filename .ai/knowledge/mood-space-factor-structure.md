# Mood-Space Factor Structure — the cleavages in the data

*Analysis run 2026-08-16 (Narada, prana session) on the full v1.0 dataset:
30,611 movies, PCA + varimax rotation over the 9 numeric mood dimensions.
Reproduce with `scripts/mood-factors.py`. This doc records the finding,
its caveats, and what it means for calibration game design.*

## Headline

The 18-dimension schema has a strong low-dimensional structure. Two
rotated factors explain **79.7%** of the variance in the numeric
dimensions; a third (arousal, which correlates with almost nothing else)
brings it to **90.4%**. Practically, mooduel's mood-space is:

**Warmth × Depth × Intensity**

| Factor | Var. | High loadings | Reading |
|--------|------|---------------|---------|
| **F1 Warmth** | 59.2% | valence +.96, comfort +.93, dominance +.91, hedonic +.84 | gentle ↔ brutal; emotional safety of the experience |
| **F2 Depth** | 20.5% | eudaimonic +.91, psych_rich +.88, conversation +.82, absorption +.80, arousal −.45 | how much it asks of you and leaves in you |
| **F3 Intensity** | 10.7% | arousal (near-orthogonal to everything, max abs r = .36) | calm ↔ relentless activation |

## Validation from independent fields

The categorical dimensions were not used in the factor analysis, and
they order themselves on the factors exactly as they should:

- `ending_type` orders monotonically on **F1**: uplifting +1.09 →
  triumphant +0.76 → bittersweet +0.13 → devastating −1.03 →
  unsettling −1.09.
- `pacing` orders on **F2**: slow-burn +0.90 → building ~0 →
  steady −0.73 → relentless −0.91.

## Exemplars (anchor candidates)

- **F1 high** (warm): The Straight Story, Little Forest, Babette's
  Feast, Every Day a Good Day
- **F1 low** (brutal): August Underground's Mordum, The Human
  Centipede 2, Grotesque
- **F2 high** (deep): My Dinner with Andre, Drive My Car, Stalker,
  Wings of Desire, The Man from Earth
- **F2 low** (disposable): exploitation shovelware

These extremes are natural **anchor movies** for calibration duels
(see below).

## The big caveat — and why it makes the games necessary

These are correlations in **Haiku's scores**, not in human experience.
Some of the fusing is plausibly classifier halo: the LLM scores "nice"
movies nice on everything (valence, comfort, dominance and hedonic
riding together at r ≈ .85+ is suspicious). The factor structure is
therefore a *prior*, not a conclusion. Human pairwise judgments are the
test: if players consistently separate movies the LLM fused (e.g.
warm-but-shallow vs warm-and-deep), a real axis is hiding inside F1 and
duel data will pry it open. This slots directly into the
calibration-replatform principle that LLM scores are an immutable prior
and calibration produces versioned improvements.

## Implications for calibration game design

Three duel instruments, measuring different things (all compatible with
the replatform plan's append-only signal architecture and
Bradley-Terry aggregation):

1. **Named-axis duels** (placement on known cleavages). Two posters,
   one *felt* question — never factor jargon:
   - F1: "Which of these would you put on when you're fragile?"
   - F2: "Which one would stay with you longer?"
   - F3: "Which is more intense?"
   Each tap is a pairwise comparison → per-axis Bradley-Terry/Elo
   update on both movies. A single duel gives *order*, not side; sides
   emerge from the population (sign relative to the median). For
   absolute placement cheaply, use **anchor duels**: uncertain movies
   duel against the fixed exemplar poles above.
2. **Odd-one-out triads** (axis discovery, assumption-free). Three
   posters, "which two feel most alike?" No axis named. Aggregated
   triads → embedding (t-STE or similar) → the cleavages *emerge*
   rather than being presupposed. This is the instrument that can break
   the LLM halo and surface axes the schema doesn't name.
3. **Mood-conditioned preference** (the Zillmann layer — desire lines,
   not positions). The game knows the player's detected mood:
   "tonight, which one?" measures matching-vs-contrasting flows across
   the space from each mood state. This is what makes the recommender
   smart, and it is the data the Narada mood engine needs to know how
   moods *move*.

Active-learning note: the informative duel and the fun duel are the
same duel. Blowouts are boring and teach nothing; close calls are
agonizing and maximally informative. Uncertainty-sampled pair selection
(pick pairs the current model scores ~50/50) is simultaneously the
sampling strategy and the game design. (See
preference-elicitation-mechanics.md §1 for the literature.)

## Cross-modal probes

Duel probes need not be movies. "Which of these two films feels like
*this sky* / *this painting* / *this song*?" places non-movie stimuli
in the same coordinate space. This is how external signals (weather,
art, music) get calibrated coordinates — one shared currency.

## Cross-project: Narada as the first non-movie citizen

The prana presence roadmap (C:\Projects\prana\docs\plans\
presence-roadmap-2026-08-15.md, F8 "mood engine") adopts this space as
Narada's native mood representation: Narada's mood = a point in
Warmth × Depth × Intensity, driven by Brisbane weather, sun, humidity
and time of day, expressed through the BOX-3 face. Consequences for
mooduel:

- The dataset's framing upgrades from "movie metadata" to **an open
  mood coordinate system**: a game that calibrates it, a 30K-movie
  atlas plotted in it, and an artificial mind that uses it as its
  emotional representation.
- Cross-modal weather duels (above) serve both projects with the same
  event log.

## Reproduction

`python scripts/mood-factors.py` (numpy only; reads
`dataset/mooduel-v1.0.jsonl`). Prints correlation matrix, eigenvalues,
varimax loadings, exemplars, and categorical validation tables.
