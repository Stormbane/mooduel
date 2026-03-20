# Games & Applications — Mooduel Dataset

## The Premise

People don't choose movies. They choose emotional trajectories. They're saying
"I want to feel X, then Y, then Z over the next two hours" — they just don't
have the vocabulary for it. Our dataset gives them that vocabulary. Every game
should teach it.

What's uniquely enabled by THIS dataset (things nobody else can build):
- Vibe sentences (natural language mood descriptors — nobody has these)
- Watch context (solo/date/friends/family — no structured dataset has this)
- Comfort level, conversation potential, emotional safety warnings
- VA + absorption + three valences + pacing + ending type as a unified profile
- 30K movies with continuous scores, not binary labels

---

## The Seven Games

### 1. Mood Drift — Daily Puzzle

*Navigate mood space to find a hidden movie. Wordle meets emotional cartography.*

**How it works**: Daily target movie (hidden). You get a hint: its VA quadrant
(e.g. "positive valence, high arousal"). You have 6 guesses. Each guess, you
name a movie. The game shows you:
- Distance arrow (how far and which direction in VA space)
- Whether pacing/arc/ending match (✓ or ✗)
- A "warmer/colder" indicator based on mood tag overlap

**The hook**: "I navigated from Hereditary to Paddington in 4 moves."
Shareable results grid showing your path through mood space.

**Why it's novel**: You're not guessing facts (like Wordle) — you're learning
to navigate emotional space. After a week of playing, people instinctively
understand valence/arousal without ever reading the theory.

**Build complexity**: Medium. Client-side, daily seed from date hash.

---

### 2. Blind Taste Test — Vibe Sentences Only

*Strip away everything except how a movie feels. Pure mood matching.*

**How it works**: Show 5 vibe sentences with no titles, no posters, no years,
no genres. Just the evocative one-liner. Pick which movie you'd watch tonight.
Reveal the movie after you choose.

**The twist**: After revealing, show the full mood profile. "You chose a movie
with -0.4 valence, -0.45 arousal. You're drawn to quiet sadness tonight."
Over multiple rounds, build a "taste profile" that shows the user their
emotional preferences.

**Why it's novel**: Tests whether mood language alone can guide choices.
Strips away all biases of marketing, star power, poster art. The vibe
sentence is doing all the work — if people choose well, the dataset is
validated.

**Research value**: Generates data on whether vibe descriptions predict
user satisfaction.

**Build complexity**: Low. Different UI over the same data.

---

### 3. Mood Roulette — Serendipity Machine

*Pull the lever. Discover what you didn't know you wanted.*

**How it works**: Three reels spin:
- Reel 1: Emotional arc (man-in-a-hole, icarus, cinderella, oedipus...)
- Reel 2: Watch context (solo, date, friends, family)
- Reel 3: Wild card (high comfort, relentless pacing, twist ending,
  conversation starter, low safety warnings, high absorption...)

Pull the lever. See matching movies. Re-spin any single reel to adjust.

**The hook**: "I got icarus + solo + devastating. The machine gave me
Requiem for a Dream." Shareable constraint combos.

**Build complexity**: Low. Query filters over the dataset.

---

### 4. Vibe Connections — NYT Connections for Movie Moods

*Four groups. Four movies each. The connection is always a mood dimension.*

**How it works**: Daily puzzle. 16 movies displayed. Group them into 4 sets
of 4. The connections are mood-based, not genre-based:
- Group 1 (yellow/easy): Movies with "triumphant" endings
- Group 2 (green): Movies with comfort level > 0.75
- Group 3 (blue): Movies with "oedipus" emotional arcs
- Group 4 (purple/hard): Movies where conversation potential > 0.9
  AND valence < 0

**Why it's brilliant**: People already know the Connections format. But the
twist — that connections are MOOD connections — teaches the vocabulary
naturally. After playing for a week, users think about movies in terms of
comfort level and emotional arcs without being taught.

**The deception**: Some groups look like genre groups but aren't. "These four
are all comedies, right?" No — they all have the same pacing. The game
trains you to look past surface features to emotional structure.

**Build complexity**: Medium. Daily puzzle generation from the dataset.
Need to ensure groups are clearly separable and don't have ambiguous members.

---

### 5. Mood Mirror — Know Thyself

*Rapid binary choices reveal your emotional fingerprint. The game that
plays you.*

**How it works**: 12 rapid-fire binary choices. No movie titles — only
abstract pairs:
- Round 1-4: Vibe sentence pairs ("Which would you rather feel tonight?")
- Round 5-8: Mood dimension trade-offs ("Comfort OR intensity?",
  "Meaning OR fun?", "Familiar OR perspective-shifting?")
- Round 9-12: Ending preference ("Resolution OR ambiguity?",
  "Catharsis OR unease?")

After 12 choices, the game maps your current emotional state onto the VA
space and generates your **Mood Card**:
- Your position on the circumplex (with a poetic quadrant name)
- Your comfort threshold
- Your hedonic/eudaimonic/rich balance
- "Tonight you are: [quadrant description]"
- Top 5 movie matches
- A shareable card with your mood constellation

**Why it's novel**: People don't know their own mood. They can't articulate
"I want negative valence, high arousal, low comfort." But they CAN make
rapid gut-level binary choices. The choices REVEAL the mood. The game is
a mirror — it shows you what you're feeling before you can name it.

**The shareable moment**: The Mood Card. "My movie mood tonight is
'Contemplative Storm' — high eudaimonic, negative valence, building pacing."
People share these. They compare them. They play again tomorrow and see
how their mood shifted.

**Build complexity**: Medium. The binary choice engine needs to efficiently
narrow the mood space with each choice. Information-theoretic question
selection — each pair should maximally partition the remaining mood space.

---

### 6. Comfort Zone — Progressive Expansion

*How far outside your comfort zone will you go tonight?*

**How it works**: The game starts by asking: "What's the most comfortable
movie you've loved?" (or lets you pick from a few high-comfort options).
This establishes your baseline.

Then it offers a sequence of movies, each slightly less comfortable than
the last:
- Level 1: Comfort 0.8+ (safe, warm, familiar shapes)
- Level 2: Comfort 0.6-0.8 (some edge, but reliable)
- Level 3: Comfort 0.4-0.6 (genuinely challenging moments)
- Level 4: Comfort 0.2-0.4 (this might shake you)
- Level 5: Comfort < 0.2 (the deep end)

At each level, the game shows:
- The vibe sentence (so you know what you're getting into)
- Emotional safety warnings (transparent, not hidden)
- The "retreat" option: stay at this level but try a different movie

**The framing**: Not "watch harder movies." Instead: "Discover what
emotions you're ready to explore." The emotional safety warnings make
this SAFE — you always know what you're walking into.

**Why it matters**: This is Zillmann's Mood Management Theory made
interactive. Some people always seek comfort (mood maintenance). Some
seek intensity (mood alteration). The game reveals which you are — and
gently invites you to try the other.

**Build complexity**: Low-medium. Sorted/filtered dataset by comfort level,
with transition logic between levels.

---

### 7. Movie Mood DJ — Emotional Arc Builder

*You are the DJ of tonight's emotional journey.*

**How it works**: A timeline/playlist interface. The user builds a movie
marathon (2-5 movies) by dragging films into a sequence. As they build,
the game visualizes the emotional arc of their playlist:
- A continuous line through VA space
- Pacing transitions (does a "relentless" film follow a "slow-burn"?)
- Comfort trajectory (building tension or winding down?)
- Ending flow (does one film's ending type set up the next?)

The game SUGGESTS transitions:
- "After Hereditary (devastating), consider Grand Budapest Hotel
  (bittersweet) to recover — or Moonlight (bittersweet) to stay in
  the melancholy."
- "Warning: two relentless films in a row may be exhausting."
- "This sequence creates a classic man-in-a-hole arc across three films."

**Presets**:
- "Rainy Sunday" — calm → contemplative → warm
- "Adrenaline Night" — building → relentless → triumphant
- "The Emotional Gauntlet" — devastating → devastating → uplifting (catharsis)
- "Date Night" — light → engaging → warm (date context only)
- "Post-Breakup Recovery" — melancholy → eudaimonic → comfort

**Why it's novel**: Nobody has built a multi-movie emotional arc designer.
Netflix recommends individual movies. We sequence emotional JOURNEYS.
The visualization of mood flowing across a playlist is genuinely new.

**The shareable moment**: "Here's my Friday night emotional arc" — a
beautiful visualization of the VA trajectory across 3 movies.

**Build complexity**: Medium-high. Needs the trajectory visualization
and smart suggestion engine.

---

## Priority & Build Order

### Wave 1: Quick wins (build with sample data, scale to 30K)
1. **Blind Taste Test** — lowest effort, showcases vibe sentences
2. **Mood Roulette** — simple filter UI, instant fun
3. **Mood Mirror** — 12 choices, shareable mood card

### Wave 2: Daily games (need full dataset for variety)
4. **Mood Drift** — daily Wordle, needs large pool for non-repetition
5. **Vibe Connections** — daily puzzle, needs careful group curation

### Wave 3: Creative tools
6. **Comfort Zone** — progressive expansion, meaningful
7. **Movie Mood DJ** — marathon builder, most complex

---

## Non-Game Applications (build later)

### Vibe Search Engine
Natural language: "something that feels like a rainy Sunday" → semantic
similarity against vibe sentences. The killer app for the dataset.

### Streaming Browser Extension
Chrome extension overlaying mood data on Netflix/Prime/Disney+.
Hover: vibe sentence, comfort level, watch context, safety warnings.

### Mood Timeline
Interactive visualization of cinema's emotional history. Average VA
per decade. Click any year to see mood outliers.

### Therapeutic Movie Guide
Input emotional goal → filtered recommendations. With safety warnings.
"For self-care, not therapy."

### Music-to-Movie Bridge
Spotify listening mood → movie VA matching. "Your music says you'd
love these tonight."

### Movie Mood Embeddings
18-dim vectors as numpy/PyTorch tensors. ML infrastructure.
