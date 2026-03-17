# TODO

## M1: Playable Loop ✅
- [x] Next.js + TypeScript + Tailwind v4
- [x] TMDB API client
- [x] Core types, MovieProfile, game state
- [x] Poster Pick rounds (5 per round, synopsis, expandable info)
- [x] Actor/Director rounds (to be removed in M2)
- [x] Tournament bracket (8→4→2→1)
- [x] Game loop orchestrator
- [x] Debug panel (real-time profile visualization)
- [x] Winner screen
- [x] Cyberpunk gameshow UI (Orbitron/Rajdhani, neon palette, scanlines, glass morphism)
- [x] Framer-motion animations
- [x] Reload round button
- [x] Popularity curve (famous→fringe across rounds)
- [x] Playwright test suite (16/16 passing)

---

## M2: Mooduel — Mood Engine + Zillmann MMT

### New Game Flow
```
Round 0: color-pick       (VA baseline)
Round 1: vibe-pick        (VA refinement)
Round 2: emotion-pick     (VA confirmation)
Round 3-8: poster-pick    (6 rounds, mood-guided, Zillmann mix)
Tournament: 8-movie bracket
```

### Phase 1: Remove Actor/Director Rounds
Strip all person-related code, replace with 6 poster-pick rounds.

- [ ] `src/lib/types.ts` — remove `actor-pick`, `director-pick` from RoundType, remove
      actor/director variants from RoundOptions, remove `peoplePreferences` from MovieProfile,
      remove `personId` from Pick, remove `TmdbPersonWithMovies`
- [ ] `src/lib/engine/game-flow.ts` — ROUND_SEQUENCE: 3 mood + 6 poster-pick
- [ ] `src/lib/engine/profile.ts` — delete `updateProfileWithPerson()`, remove
      `peoplePreferences` from `createEmptyProfile()`
- [ ] `src/hooks/use-game.ts` — remove `pickPerson` handler, actor/director branches
      in `loadNextRound`, remove from return interface
- [ ] `src/components/game/game.tsx` — remove PersonCard import, actor/director render blocks
- [ ] `src/lib/copy.ts` — remove actor-pick/director-pick entries
- [ ] `src/components/game/debug-panel.tsx` — remove ACTOR/DIRECTOR_AFFINITY sections
- [ ] `src/lib/tmdb/client.ts` — remove NOTABLE_ACTOR_IDS, NOTABLE_DIRECTOR_IDS,
      getPopularActors, getPopularDirectors, getPopularPeople, getPersonMovieCredits, profileUrl
- [ ] Delete `src/components/game/person-card.tsx`
- [ ] Delete `src/app/api/tmdb/people/route.ts`
- [ ] `tests/game.spec.ts` — simplify: 6 poster-click rounds, no actor/director detection
- [ ] Verify: `npm run build` + Playwright tests pass

### Phase 2: Movie Mood Dataset (LLM Classification)

Build an open movie mood dataset — per-movie emotional/experiential classification using
LLM analysis of plot summaries and critic reviews. **This is the first open dataset of its
kind.** No one has published structured mood scores for movies at scale.

#### 2a: Data Pipeline — Assemble Input Corpus

**Goal:** 50K most relevant movies with rich text for classification.

**Determining the 50K:**
1. Download Kaggle TMDB 1M dataset (bulk metadata with popularity, vote_count, vote_avg)
2. Filter: `has_overview AND vote_count >= 10 AND NOT adult`
3. Rank by composite relevance: `0.4 * log(vote_count) + 0.3 * log(popularity) + 0.3 * vote_average/10`
4. Take top 50,000 by this score
5. This captures: all well-known films, critically acclaimed obscure films, and sufficiently-
   reviewed recent releases. The vote_count floor of 10 excludes junk entries while keeping
   cult films.

**Input sources per movie:**

| Source | What it provides | Coverage |
|---|---|---|
| Kaggle TMDB 1M | genres, overview, ratings, popularity, keywords, language, release_date | ~1.3M movies |
| CMU Movie Summary Corpus | Wikipedia plot summaries (300-1000 words) | 42,306 movies |
| WikiPlots corpus | Extended Wikipedia plots | 112,936 movies |
| Kaggle Rotten Tomatoes | Full critic reviews + critics consensus | 17,000 movies |
| MovieLens Tag Genome | 1,128 tags with 0-1 relevance scores | 9,734 movies |

**Join strategy:**
- Primary key: TMDB ID
- TMDB → IMDb via TMDB `/external_ids` endpoint (or Kaggle dataset includes `imdb_id`)
- IMDb → CMU/WikiPlots via title+year fuzzy match + IMDb ID where available
- IMDb → RT Kaggle via title+year match
- TMDB → Wikidata via TMDB `/external_ids` (returns `wikidata_id`)
- Wikidata → Wikipedia URL via sitelink

**Output:** `data/movie-input-corpus.jsonl` — one line per movie with all joined text.

- [ ] Download and parse Kaggle TMDB 1M dataset
- [ ] Compute relevance score and select top 50K
- [ ] Download and parse CMU Movie Summary Corpus + WikiPlots
- [ ] Download and parse Kaggle RT reviews dataset
- [ ] Join datasets on TMDB ID / IMDb ID / title+year
- [ ] Fetch external IDs (IMDb, Wikidata) from TMDB API for all 50K
- [ ] Resolve Wikipedia URLs from Wikidata IDs
- [ ] Build `movie-input-corpus.jsonl`

#### 2b: Classifier Prompt + Prototype

**Schema per movie:**

```typescript
interface MovieMoodScore {
  // === Identifiers ===
  tmdbId: number;
  imdbId: string | null;          // "tt0111161"
  wikidataId: string | null;      // "Q25188"
  title: string;
  originalTitle: string;
  year: number;

  // === URLs (for consumers of the dataset) ===
  tmdbUrl: string;                // "https://www.themoviedb.org/movie/278"
  imdbUrl: string | null;         // "https://www.imdb.com/title/tt0111161"
  wikipediaUrl: string | null;    // "https://en.wikipedia.org/wiki/The_Shawshank_Redemption"
  letterboxdUrl: string | null;   // "https://letterboxd.com/film/the-shawshank-redemption"
  rottenTomatoesUrl: string | null;

  // === Movie Metadata (for filtering/context) ===
  genres: string[];               // ["Drama", "Crime"]
  originalLanguage: string;       // "en"
  releaseDate: string;            // "1994-09-23"
  runtime: number | null;         // minutes
  tmdbPopularity: number;
  tmdbVoteCount: number;

  // === Ratings (per-source) ===
  imdbRating: number | null;      // 0-10
  imdbVotes: number | null;
  rottenTomatoesRating: number | null;  // 0-100 (critics score)
  rottenTomatoesAudience: number | null; // 0-100
  tmdbRating: number | null;      // 0-10

  // === Core Affect (continuous) ===
  valence: number;                // -1 to +1 (displeasure ↔ pleasure)
  arousal: number;                // -1 to +1 (calm ↔ intense)
  dominance: number;              // -1 to +1 (overwhelming ↔ empowering)

  // === Zillmann's Absorption (continuous) ===
  absorptionPotential: number;    // 0 to 1 (how cognitively consuming)

  // === Three Experience Valences (continuous) ===
  hedonicValence: number;         // 0 to 1 (fun, pleasure, escape)
  eudaimonicValence: number;      // 0 to 1 (meaning, insight, being moved)
  psychologicallyRichValence: number; // 0 to 1 (novelty, complexity, perspective)

  // === Emotional Arc ===
  emotionalArc: "rags-to-riches" | "riches-to-rags" | "man-in-a-hole"
              | "icarus" | "cinderella" | "oedipus";

  // === Discrete Emotions ===
  dominantEmotions: string[];     // top 2-3 from Plutchik's wheel
                                  // ["anticipation", "joy", "surprise"]

  // === Thematic Tags (for semantic affinity matching) ===
  moodTags: string[];             // ["redemption", "isolation", "friendship", "institutional"]

  // === Classification Meta ===
  inputSources: string[];         // ["tmdb", "wikipedia", "rt-reviews"]
  classifierModel: string;        // "claude-haiku-4-5"
  classifiedAt: string;           // ISO timestamp
  classifierVersion: string;      // semver for prompt/schema changes
}
```

**Prompt design:**
- System prompt: explain circumplex model, Zillmann's MMT, three experience types,
  emotional arc shapes, Plutchik's wheel. Define each dimension with anchoring examples.
- User prompt: movie title + genres + TMDB overview + Wikipedia plot + 2-3 critic review
  excerpts (when available). Ask for structured JSON output.
- Few-shot examples: 5-8 well-known movies spanning all quadrants and arc types.

**Prototype with `claude -p`:**
- Use `--json-schema` for structured output validation
- Use `--model haiku` for cost efficiency
- Test on ~50 diverse movies, manually validate scores
- Compare LLM scores to MovieLens Tag Genome where overlap exists

- [ ] Design classifier system prompt with theory + examples
- [ ] Build few-shot example set (8 movies across all quadrants)
- [ ] Write `scripts/classify-movie.sh` — single movie via `claude -p`
- [ ] Write `scripts/classify-batch-prototype.sh` — 50 movies via `claude -p`
- [ ] Validate against MovieLens Tag Genome overlap
- [ ] Iterate on prompt until scores are sensible

#### 2c: Production Batch Classification

- [ ] Write `scripts/batch-classify.py` — Anthropic Message Batches API
  - Reads `movie-input-corpus.jsonl`
  - Builds batch request (up to 100K per batch)
  - Submits to `POST /v1/messages/batches`
  - Polls for completion, downloads results
  - Writes `data/movie-mood-scores.json`
- [ ] Run batch: 50K movies via Haiku 4.5 (~$11-35, ~1 hour)
- [ ] Validate: spot-check 100 random scores, check distribution sanity
- [ ] Build quality report: distribution histograms per dimension,
      outlier detection, coverage stats

#### 2d: Integration with Mooduel

- [ ] `src/lib/mood-api/cache.ts` — load scores from static JSON or fetch API
- [ ] `src/app/api/mood/route.ts` — GET by movieId, POST batch
- [ ] `src/lib/engine/candidates.ts` — scoreMovie uses LLM VA when available,
      genre fallback when not
- [ ] `src/hooks/use-game.ts` — load mood scores, pass to scoring
- [ ] Verify: game works without mood data (genre fallback), improves with it

#### 2e: Open Data Release

- [ ] `data/movie-mood-scores.json` — the full 50K dataset
- [ ] `data/README.md` — schema docs, methodology, citation info, license
- [ ] Publish to GitHub releases / HuggingFace datasets
- [ ] `.gitignore` — add `data/movie-input-corpus.jsonl` (too large), keep scores

### Phase 3: Broader Movie Pool

Expand in-game pool using mood-guided TMDB discover.

- [ ] `src/lib/tmdb/client.ts` — `discoverByMoodQuadrant(quadrant, page)`:
  - Q1 happy/excited: Comedy, Adventure, Animation, Music
  - Q2 tense/anxious: Horror, Thriller, Crime, War
  - Q3 sad/melancholy: Drama, History, Documentary
  - Q4 calm/content: Romance, Family, Fantasy
- [ ] `src/lib/tmdb/client.ts` — `discoverDiverse(page)` for variety
- [ ] `src/hooks/use-game.ts` — Stage 1: same prefetch on mount.
      Stage 2: after mood detection (round 3), fetch mood-quadrant movies.
      Between poster rounds, keep pool > 30 unseen.
- [ ] `src/lib/engine/candidates.ts` — popularity floor per round:
  - Rounds 3-4: > 40, Rounds 5-6: > 15, Rounds 7-8: > 3
- [ ] Verify: pool grows after mood detection, later rounds more diverse

### Phase 4: Zillmann's Mood Management Theory

Implement mood regulation tracking and adaptive movie mix.

- [ ] `src/lib/types.ts` — add `MoodRegulationMode`, `MoodRegulation` types
      ```typescript
      type MoodRegulationMode = "deepening" | "reversing" | "undetermined";
      interface MoodRegulation {
        mode: MoodRegulationMode;
        matchingPicks: number;
        contrastingPicks: number;
        confidence: number;        // 0-1
        targetVA: { valence: number; arousal: number };
      }
      ```
      Add `moodRegulation: MoodRegulation` to `MovieProfile`.
- [ ] `src/lib/engine/mood.ts` — quadrant helpers: `getVAQuadrant()`,
      `getOppositeQuadrant()`, `getAdjacentQuadrants()`
- [ ] `src/lib/engine/profile.ts` — after each poster-pick, compare movie VA to
      detected mood VA. Same quadrant → matchingPicks++, opposite → contrastingPicks++.
      Derive mode: matching > contrasting×1.5 → deepening, vice versa → reversing.
      Update targetVA accordingly.
- [ ] `src/lib/engine/candidates.ts` — Zillmann mix in `selectPosterCandidates`:
  - Default: 3 matching (60%), 1 adjacent (20%), 1 contrasting (20%)
  - Deepening: 4 matching, 1 adjacent
  - Reversing: 2 matching, 1 adjacent, 2 contrasting
- [ ] `src/components/game/debug-panel.tsx` — MOOD_MGMT section:
      regulation mode badge, matching/contrasting counts, target VA, confidence
- [ ] Verify: debug panel shows mode shifting, movie mix adapts

### Phase 5: Landing Page + Open Source Prep

- [ ] `src/components/splash-screen.tsx` — rebuild with cyberpunk aesthetic:
  - Logo + tagline "Science-backed mood discovery for movies"
  - Three info cards (staggered): Mood Detection, Mood Management, Tournament
  - Science footer (circumplex, Zillmann, visual affect research)
  - Play button + "~2 min · no account needed"
- [ ] `.env.local.example` — document all env vars
- [ ] `.gitignore` — ensure data files handled correctly
- [ ] Verify: landing page renders, `npm run build` passes, no circular deps

---

## M3: Smart Recommendations
- [ ] Active learning (pick most informative candidates per round)
- [ ] Long-term taste profile (aggregate across sessions)
- [ ] Social: share bracket, taste match with friends
- [ ] "Play again" with session memory

## M4: Ship It
- [ ] Vercel production deployment
- [ ] Custom domain
- [ ] Open source prep (LICENSE, README, clean secrets)
- [ ] SEO + social sharing (share winner movie card)
