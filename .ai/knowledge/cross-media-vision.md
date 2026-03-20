# Cross-Media Mood Database — Vision

## The Core Insight

Mood is medium-agnostic. The emotional experience of watching Interstellar,
playing Journey, reading The Road, and listening to OK Computer — these are
all describable in the same VA/dominance/absorption space. The medium changes
the delivery mechanism, but the emotional topology is the same.

Nobody has built this. Individual media mood datasets exist in fragments
(Spotify has audio features, MovieLens has tags), but nobody has unified
them into a single emotional space with consistent dimensions across media.

---

## Schema Transfer Analysis

### Transfers perfectly (universal emotional descriptors):
- Valence, Arousal, Dominance
- Hedonic, Eudaimonic, Psychologically Rich valence
- Comfort Level
- Mood Tags
- Dominant Emotions (Plutchik's wheel)
- Conversation Potential
- Vibe Sentence ("what does experiencing this feel like?")
- Emotional Safety Warnings

### Needs adaptation per medium:
- **Emotional Arc** → works for narrative media (movies, books, TV, story games)
  but not for music, abstract games, or visual art
- **Pacing** → translates differently. A "slow-burn" book is different from a
  "slow-burn" movie. Games have player-controlled pacing.
- **Watch Context** → becomes "Experience Context" — solo/friends/family still
  works. "Date" applies to movies/music but less to games.
- **Absorption** → maps differently. Games have ENFORCED absorption (you must
  engage or die). Books have voluntary absorption. Movies are in between.

### Medium-specific dimensions to ADD:

**Video Games:**
- Agency (how much the player controls the emotional trajectory)
- Skill-Emotion coupling (does frustration/mastery affect the mood?)
- Replayability (does the emotional experience change on repeat?)
- Complicity (does the game make YOU responsible for moral outcomes?)

**Books:**
- Prose density (pages per emotional beat)
- Internal vs External (character's head vs action)
- Prose style (spare, lush, experimental)
- Re-readability

**TV Shows:**
- Episode-level vs season-level mood profile
- Binge-ability (does the emotional arc reward continuous viewing?)
- Serial vs episodic emotional structure
- Season arc shape (does each season have its own emotional arc?)

**Music:**
- Temporal grain (3-minute song vs 2-hour movie)
- Album arc (emotional journey across tracks)
- Lyrical vs instrumental emotional split
- Spotify audio features map directly: valence→valence, energy→arousal

---

## Cross-Media Applications

### 1. Mood Translation Engine
"I loved the VIBE of Blade Runner 2049. What book feels like that? What game?
What album?" Not "similar content" but "similar emotional experience across
different mediums." This is the holy grail of recommendation.

### 2. Cross-Media Emotional Playlists
Multimedia emotional journeys: "Start with this album (setting the mood),
then watch this film (deepening it), then play this game (processing it)."
The Movie Mood DJ concept extended across all media.

### 3. Mood Continuity Engine
"I just finished The Road (devastating, low comfort, high eudaimonic). What
movie would continue this journey? What music would complement? What game
would provide catharsis?" Emotional thread that weaves across media.

### 4. Universal Vibe Search
Search by feeling across ALL media simultaneously: "Something contemplative
and beautiful but with an edge of sadness" → returns movies, books, games,
music that all live in that emotional space.

### 5. Media Metabolism Research
Different media process emotions differently:
- A devastating movie: 2 hours, lingers for a day
- A devastating book: days/weeks, sinks deeper
- A devastating game: 40 hours, creates complicity (YOU made the choices)
- A devastating album: 45 minutes, can be repeated (chosen re-exposure)

How does emotional processing vary by medium? A cross-media mood database
could reveal this — genuine psychology research.

### 6. Emotional Palette Mapping
Show where emotional spaces are EMPTY in certain media. Maybe there are no
"high comfort, slow-burn, oedipus" video games. That gap in the emotional
landscape is where new art should go. A tool for creators, not just consumers.

### 7. Cross-Media Mood Regulation (Zillmann Extended)
When stressed, do you reach for a comfort movie, a familiar album, or a
flow-state game? Different media serve different mood regulation functions.
Understanding this is genuine psychology research at scale.

### 8. The Resonance Graph (→ Beautiful Tree)
Two people who love the same emotional patterns across different media —
same mood tags in movies AND games AND books — have deeper resonance than
people who just like the same genre. This is the foundation for Beautiful
Tree's cross-media matching.

---

## Data Sources Per Medium

### Video Games (~15-20K titles feasible)
- **IGDB** — metadata, ratings (like TMDB for games)
- **Steam reviews** — massive corpus, emotional language
- **Steam tags** — user-generated, similar to MovieLens
- **RAWG API** — another game database, good coverage
- **HowLongToBeat** — completion times (maps to absorption)
- **Metacritic** — game critic reviews

### TV Shows (~10-15K series feasible)
- **TMDB** — already has TV shows, same API
- **TVmaze API** — episode-level data
- **IMDb episode ratings** — temporal mood tracking across seasons
- **Reddit episode threads** — real-time emotional reactions per episode

### Books (~20-30K titles feasible)
- **Open Library / Google Books** — metadata
- **Goodreads Kaggle dumps** — ratings + reviews + shelves
- **LibraryThing tags** — crowd-sourced tags (like MovieLens for books)
- **Project Gutenberg** — full text for classics (plot extraction)
- **Amazon book reviews** — massive review corpus

### Music (~50K albums feasible)
- **Spotify Audio Features** — valence, energy already in VA space!
- **MusicBrainz** — open music database, metadata
- **Last.fm tags** — crowd-sourced mood tags
- **Genius** — lyrics for text analysis
- **Rate Your Music** — detailed reviews and tagging

---

## The Business Evolution

**Phase 1 (now)**: Mooduel Movie Database — 30K movies, open dataset
**Phase 2**: Add TV shows (same TMDB API + LLM pipeline)
**Phase 3**: Add video games (IGDB + Steam + LLM)
**Phase 4**: Add books (Open Library + Goodreads + LLM)
**Phase 5**: Add music (Spotify features + LLM for albums)
**Phase 6**: Unified Mood API — "the emotional layer for any recommendation engine"

Each phase reuses the same LLM classification pipeline. The prompt adapts
per medium but the core schema (VA, absorption, three valences, comfort,
vibe sentence) stays consistent. The infrastructure scales.

The end state: **Mooduel becomes the platform for emotional discovery
across all media.** Not a movie picker. A mood engine.

And the cross-media resonance graph feeds directly into Beautiful Tree.
