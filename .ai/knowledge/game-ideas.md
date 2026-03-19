# Games & Applications — Mooduel Dataset

What's uniquely enabled by THIS dataset (things you can't do with just TMDB/IMDb):
- Vibe sentences (natural language mood descriptors — nobody has these)
- Watch context (solo/date/friends/family — no structured dataset has this)
- Comfort level, conversation potential, emotional safety warnings
- VA + absorption + three valences + pacing + ending type as a unified profile
- 30K movies with continuous scores, not binary labels

---

## Games

### 1. Mood Drift (Daily Game — Wordle for Movies)

**Concept**: Daily puzzle. You get a hidden target mood profile (shown as a VA
quadrant hint). You have 6 guesses. Each guess, you name a movie and see how
close its mood coordinates are to the target. Navigate mood space to find it.

**Why it works**: Wordle-style virality. Shareable results grid. Teaches people
to think about movies in mood terms. Drives daily traffic.

**What it leverages**: VA coordinates, emotional arc, pacing — the core
novel dimensions.

**Effort**: Medium. Client-side only, uses the static dataset.

**Viral mechanic**: Share your path through mood space. "I went from Hereditary
to Paddington in 4 moves."

---

### 2. Blind Taste Test (Vibe Sentences Only)

**Concept**: Show 5 vibe sentences with no titles, no posters, no metadata.
Just the evocative one-liner. Pick which movie you'd watch tonight. Reveal
the movie after you choose.

**Why it works**: Tests whether mood language alone can guide choices.
Strips away all the biases of marketing, star power, poster art. Pure
mood matching.

**What it leverages**: Vibe sentences — the most novel dimension in
the dataset. Nobody else has these.

**Effort**: Low. Just a different UI over the same game engine.

**Research value**: Generates data on whether vibe descriptions predict
user satisfaction. Feed back into Beautiful Tree's "resonance vs similarity"
question.

---

### 3. Emotional Journey Planner (Movie Marathon Builder)

**Concept**: Design a movie night by drawing an emotional arc. Drag a curve
on a VA graph: "start calm, build tension, cathartic release, end warm."
The app sequences 3-5 movies that trace that trajectory through mood space,
respecting pacing transitions (don't follow a relentless film with another
relentless film).

**Why it works**: Solves a real problem nobody else can solve. "What do we
watch?" becomes "what emotional journey do we want?" Planning a movie
marathon becomes creative and intentional.

**What it leverages**: VA coordinates, pacing, ending type, comfort level.
The sequencing logic needs all of these.

**Effort**: Medium-high. Needs a path-finding algorithm through mood space.

**Variants**:
- "Rainy Weekend" preset (calm → contemplative → uplifting)
- "Halloween Night" preset (building → relentless → devastating → building)
- "Date Night Arc" preset (light → engaging → warm)

---

### 4. Couples Movie Mediator

**Concept**: Two people each input their current mood (via the same
color/vibe/emotion flow as Mooduel). App finds the movie at the
intersection — satisfies both mood profiles simultaneously.

**Why it works**: Solves the #1 movie-night argument. "What should we
watch?" is a mood negotiation problem, not a genre preference problem.
Nobody else frames it this way.

**What it leverages**: VA coordinates for two people, watch context
("date" filter), comfort level (avoid uncomfortable mismatches),
conversation potential (pick movies that spark connection).

**Effort**: Medium. Reuses the mood detection flow, adds a merge step.

---

### 5. Mood Roulette

**Concept**: Slot machine of mood constraints. Three reels spin:
- Reel 1: Emotional arc (man-in-a-hole, icarus, cinderella...)
- Reel 2: Watch context (solo, date, friends, family)
- Reel 3: Wild card (high comfort, relentless pacing, twist ending...)

Pull the lever. See what movies match all three. Serendipitous discovery.

**Why it works**: Fun, instant, no decision fatigue. Good for "I'll
watch anything" moods. Shareable: "I got icarus + solo + devastating.
The machine gave me Requiem for a Dream."

**Effort**: Low. Query the dataset with three filters.

---

### 6. Movie Mood Chain

**Concept**: Start with any movie. The next movie must share at least
one mood dimension (similar valence, same arc, overlapping tags) but
differ meaningfully in another. Build the longest chain without repeating.

**Why it works**: Strategy game. Shows how movies connect through mood
space in unexpected ways. "Parasite → Get Out → Superbad" (each shares
one dimension with the previous but shifts the mood).

**Effort**: Low-medium. Client-side chain validation against the dataset.

**Multiplayer**: Competitive — two players alternate adding to the chain.
First to break the rules loses.

---

### 7. Mood Bingo (Social Media Game)

**Concept**: Generate a 5×5 bingo card with mood descriptors:
"devastating ending", "solo watch", "absorption > 0.8", "vibe mentions
rain", "comfort level < 0.3". Watch movies throughout the month.
Mark off cells. Share your card.

**Why it works**: Long-tail engagement. Social media shareable.
Encourages diverse viewing. Monthly reset.

**What it leverages**: Every dimension becomes a bingo cell.

**Effort**: Very low. Generate + share.

---

## Applications (Non-Game)

### 8. Vibe Search Engine

**Concept**: Natural language movie search. Type "something that feels
like a rainy Sunday" or "I need to feel empowered" or "weird but
beautiful". Semantic similarity against vibe sentences + mood tags.

**Why it works**: This is what Netflix search SHOULD be but isn't.
People think in moods, not genres. The vibe sentences are purpose-built
for this.

**Implementation**: Embed all 30K vibe sentences with a small model.
Cosine similarity against user input. Augment with mood tag matching.

**Effort**: Medium. Needs embedding model (can use a small one client-side
via transformers.js, or server-side).

---

### 9. Streaming Overlay / Browser Extension

**Concept**: Browser extension that overlays mood data on Netflix/Prime/
Disney+ catalog pages. Hovering over a movie shows: vibe sentence,
comfort level, watch context, emotional safety warnings.

**Why it works**: Meets users where they already are. No new app to
learn. Instant value.

**What it leverages**: Everything — especially comfort level and safety
warnings, which streaming UIs completely lack.

**Effort**: Medium. Chrome extension + static dataset lookup by title.

---

### 10. Therapeutic Movie Guide

**Concept**: Mood-informed movie recommendations for wellbeing contexts.
Input: "processing grief", "need distraction from anxiety", "building
courage". Output: movies with appropriate mood profiles, filtered for
emotional safety.

**Why it works**: Cinema therapy is a real practice (cinematherapy).
No tool exists that matches therapeutic goals to structured movie mood
data. Comfort level + safety warnings + eudaimonic valence make this
uniquely possible.

**What it leverages**: Comfort level (don't retraumatize), emotional
safety warnings (avoid triggers), eudaimonic valence (meaningful not
just distracting), absorption potential (Zillmann — high absorption
prevents rumination).

**Effort**: Medium. Mostly a specialized query interface over the dataset.

**Sensitivity**: Needs careful framing. "For self-care, not therapy."
Not medical advice.

---

### 11. Music-to-Movie Bridge

**Concept**: Connect to Spotify. Analyze your recent listening mood
(Spotify's valence + energy features). Map to movie VA space. Recommend
movies that match your current musical mood.

**Why it works**: "You've been listening to melancholic indie all week.
Here are movies that match that headspace." Cross-modal mood matching
is novel and feels magical.

**What it leverages**: VA coordinates (directly map to Spotify's
valence/energy), pacing (maps to tempo), comfort level (maps to
acousticness).

**Effort**: Medium-high. Spotify OAuth + feature mapping.

---

### 12. Mood Journal + Watch Tracker

**Concept**: Log your mood daily (quick VA tap). Track which movies you
watch. Over time, reveal patterns: "You watch high-arousal content when
stressed" or "Your comfort viewing is always man-in-a-hole arcs."
Zillmann's Mood Management Theory made personal.

**Why it works**: Self-awareness tool. People don't realize their
viewing patterns correlate with emotional states. Showing them the
pattern is powerful.

**What it leverages**: All mood dimensions + temporal tracking.

**Effort**: High. Needs user accounts, persistent storage.

---

### 13. Movie Mood Embeddings (Developer Tool)

**Concept**: Pre-computed 18-dimensional mood vectors for 30K movies,
released as numpy arrays / PyTorch tensors. Plug directly into
recommendation models, transfer learning, media psychology research.

**Why it works**: Researchers and ML engineers can use mood as a
feature without running the classification themselves. Becomes
infrastructure.

**What it leverages**: The raw numerical data in a ML-ready format.

**Effort**: Very low. Just a different export format of the same data.

---

## Priority Ranking

### Build now (low effort, high impact, drives traffic)
1. **Mood Drift** — daily game, Wordle virality
2. **Blind Taste Test** — unique, showcases vibe sentences
3. **Mood Roulette** — instant fun, zero decision fatigue

### Build next (medium effort, strong product)
4. **Vibe Search Engine** — the killer app for the dataset
5. **Emotional Journey Planner** — solves a real problem
6. **Couples Movie Mediator** — solves the biggest movie-night problem

### Build later (higher effort or niche)
7. **Streaming Overlay** — browser extension, meets users where they are
8. **Therapeutic Movie Guide** — meaningful but needs careful execution
9. **Music-to-Movie Bridge** — cool but needs Spotify integration
10. **Movie Mood Embeddings** — developer audience, ML community

### Keep as ideas
11. **Movie Mood Chain** — fun but niche
12. **Mood Bingo** — social media play
13. **Mood Journal** — needs user accounts, bigger scope
