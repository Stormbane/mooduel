# TODO

## M1: Playable Loop ✅
- [x] Next.js + TypeScript + Tailwind v4
- [x] TMDB API client
- [x] Core types, MovieProfile, game state
- [x] Poster Pick rounds (5 per round, synopsis, expandable info)
- [x] Tournament bracket (8→4→2→1)
- [x] Game loop orchestrator
- [x] Debug panel (real-time profile visualization)
- [x] Winner screen
- [x] Cyberpunk gameshow UI (Orbitron/Rajdhani, neon palette, scanlines, glass morphism)
- [x] Framer-motion animations
- [x] Reload round button
- [x] Popularity curve (famous→fringe across rounds)
- [x] Playwright test suite (19/19 passing)

---

## M2: Mooduel — Mood Engine + Zillmann MMT

### Phase 1: Remove Actor/Director Rounds ✅

### Phase 2: Movie Mood Dataset ✅ (corpus + classifier ready)
- [x] Data pipeline: TMDB → enrich → top 30K → Wikipedia plots → corpus
- [x] RT critic reviews joined (12,656 movies, 41.3%)
- [x] MovieLens Tag Genome joined (8,815 movies, 28.8%)
- [x] TMDB user reviews (fetching, ~58% hit rate on remaining)
- [x] TMDB certifications (fetching, ~99.8% hit rate)
- [x] Classifier v2 prompt + schema (18 dimensions)
- [x] test-10-v2 validated (10/10 passed, all dimensions sensible)
- [x] Batch classifier script ready (`batch-classify.mjs`)
- [x] Batch classification RAN 2026-03-20: 30,611 movies, 4 batches
      (canonical output: data/movie-mood-scores.jsonl)
- [x] Distribution analysis done 2026-07-17 (see audit): vibe sentences
      30,609/30,611 unique; known issues → arc mode collapse (64.5%
      man-in-a-hole), arousal inflation, enum leakage (~1,200 rows),
      0.05-grid quantization. Fixes tracked in M2.5 below.

### Phase 3: Integration with Mooduel Game ✅
- [x] Supabase database: 5 tables (movies, profiles, corrections, votes, reputation_events)
- [x] 30,611 movies seeded from mood-data.json → Supabase
- [x] API routes: /api/movies (paginated), /scatter, /stats, /pool, /corrections, /vote, /leaderboard
- [x] Explore page: server-side search/filter/pagination
- [x] Dashboard: server-computed stats + scatter data
- [x] All 7 game pages: read from /api/movies/pool instead of static JSON
- [x] Auth: GitHub + Google OAuth, AuthProvider context, AuthButton in navbar
- [x] Community calibration: CorrectionDialog, CorrectionList with voting, wired into MovieCard
- [x] Supabase MCP configured (.mcp.json) for self-sufficient DB operations
- [x] Deleted public/mood-data.json (17MB) — all data flows from Supabase
- [ ] Winner screen: show mood profile card for winning movie
- [ ] Verify: game works without mood data (genre fallback), improves with it

### Phase 4: Zillmann's Mood Management Theory
- [ ] Mood regulation tracking (deepening vs reversing detection)
- [ ] Adaptive movie mix per regulation mode
- [ ] Debug panel: regulation mode, matching/contrasting counts

### Phase 5: Broader Movie Pool
- [ ] Mood-guided TMDB discover by VA quadrant
- [ ] Pool replenishment between rounds
- [ ] Popularity floor curve per round

---

## M2.5: Calibration Replatform (2026-07-17)
Full design + review log: `.ai/knowledge/calibration-replatform-plan.md`
Core idea: games are calibration engines — every play is a label that
repairs the dataset's weak dimensions.

### Foundations ✅ (Phases 0–3 of the plan, all committed + smoke-tested)
- [x] Phase 0 release blockers: build fix, LICENSE, avatar hosts,
      .env.example, README schema reconciliation, dataset binaries untracked
- [x] Enum patch ledger: 11,876 mechanical patches, 1,213 fields queued
      for LLM repair (`scripts/data-pipeline/10-normalize-enums.mjs`)
- [x] score_patches + movie_scores_baseline tables (supabase/003)
- [x] Validated apply script (`11-apply-patches.mjs`, dry-run clean)
- [x] Reproducible seed: enrichment snapshot + rewritten seed-movies.ts
- [x] Snapshot-bound manifest export (`export-dataset.ts --version`)
- [x] Signals trust boundary: assignments + calibration_signals,
      deal/submit RPCs, session + IP caps (supabase/004, 006)
- [x] Bayesian BT aggregation engine + synthetic test (rho=0.976)
      (`scripts/calibration/`), weekly GitHub Action (unpromoted runs)
- [x] Atomic run promotion: set-equality proven, advisory-locked (supabase/005)
- [x] Games SDK: signed anon sessions, pool service, /api/games/* routes,
      idempotent client emitter (`src/lib/games/`)
- [x] PvP concurrency skeleton: match_secrets (never client-readable),
      single-claim invites, versioned idempotent moves, deadline forfeit

### Blocked on Suti
- [ ] Fresh ANTHROPIC_API_KEY (current 401) → run:
      reclassify-enums.mjs submit/fetch → 11-apply-patches.mjs →
      export-dataset.ts --version 1.0.1 → upload HF (v1.0.1)
- [ ] GitHub repo secrets for calibration Action
      (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] SESSION_TOKEN_SECRET in production env at deploy
- [ ] Buy Me a Coffee link in FUNDING.yml (account pending)

### Calibration gate (after Hotter ships)
- [ ] 2–4 week shadow run; replay/abuse tests; BT connectivity diagnostics
- [ ] Anchor set (~300 movies) for isotonic scale mapping
- [ ] First promotion + freeze event schema v1 → unblocks dataset v1.1

---

## M3: Release — Landing + Explore + About

### Landing Page (`/`)
- [ ] Hero: tagline + Play CTA + Explore Dataset CTA
- [ ] Animated demo loop of game flow
- [ ] "How It Works" — 3-step visual (vibes → movies → tournament)
- [ ] "The Science" — circumplex diagram, Zillmann, 18 dimensions
- [ ] "The Dataset" — stats bar + scrolling vibe sentences
- [ ] Trust block: GitHub stars, movie count, open source badge

### Explore Page (`/explore`) — Mooduel Movie DB ✅
- [x] Search by title (server-side via Supabase, debounced)
- [x] Filter by pacing, ending type, watch context
- [x] Server-side pagination with "show more"
- [x] Full mood card: all 18 dimensions visualised (MovieCard expanded view)
- [ ] Filter by mood (VA sliders, comfort level)
- [ ] Browse by vibe (scrollable vibe sentences, click to explore similar)
- [ ] Mood map on explore page
- [ ] Mobile responsive

### About Page (`/about`)
- [ ] What is Mooduel — game + dataset overview
- [ ] The Mood Model — circumplex diagram, explain all dimensions
- [ ] Methodology — data pipeline, classifier design, validation
- [ ] Dataset docs (`/about/dataset`) — schema, downloads, HuggingFace, BibTeX
- [ ] Open Source — GitHub link, tech stack, contributing
- [ ] Team / credits

### Open Data Release
- [ ] Export: `mooduel-v1.0.json`, `.csv`, `.parquet`
- [ ] HuggingFace dataset card + upload
- [ ] GitHub Releases backup
- [ ] License: CC-BY-NC-4.0
- [ ] CITATION.cff in repo root
- [ ] README.md — banner, badges, demo GIF, quick start, schema, citation

### Monetisation
- [ ] Streaming affiliate links on winner screen (JustWatch deeplinks)
- [ ] GitHub Sponsors — FUNDING.yml, tiered ($5/$15/$50)
- [ ] Buy Me a Coffee — button on landing page + `/donate` page
- [ ] Commercial license page (email-based, $500-2K)

---

## M4: The Game Slate (Phase 4 of the replatform plan)
Build order chosen so each game exercises the newest foundation layer.
To be built with high effort and max creative agency (Suti, 2026-07-17) —
NOT in an autonomous loop. Rules/feel are open; the SDK + PvP skeleton
(match_secrets, submit_move, signals) are the fixed floor.

### 1. Hotter — pairwise mood duel
- [ ] Two posters, one question ("Which is scarier?"), tap, streak
- [ ] Emits pairwise signals via /api/games/pair + emitSignal (SDK ready)
- [ ] "You vs the model" framing until consensus data accrues
- [ ] Starts the calibration flywheel for arousal/conversation

### 2. Mooduel: The Card Game — the flagship PvP
- [ ] Draft 8 movies, trick-taking over mood categories
- [ ] House bot + async PvP via challenge links (skeleton ready)
- [ ] Game rules on top of submit_move; hands via match_secrets/get_hand
- [ ] Realtime live mode as fast-follow

### 3. Shape of Stories — pick the arc
- [ ] Six drawn Vonnegut/Reagan curves, pick the shape for a known movie
- [ ] Emits categorical signals → rebuilds the collapsed arc dimension

### 4. Mood Bridge — daily A→B pathfinding
- [ ] Get from Movie A to Movie B in ≤5 hops within mood-distance budget
- [ ] Par scores, daily seed, shareable path

### 5. The Dinner Party — persona matchmaking puzzle
- [ ] Curate one film for four described emotional states
- [ ] Zillmann MMT as a puzzle; scored against profiles

### Earlier experiments (built, hidden from nav per 2026-04-25 decision)

#### Mood Drift (Daily Game — Wordle for Movies)
- [ ] Daily target mood profile (hidden VA + arc)
- [ ] 6 guesses: name a movie, see distance to target
- [ ] Shareable results grid ("Hereditary → Paddington in 4 moves")
- [ ] Daily reset, streak tracking

#### Blind Taste Test (Vibe Sentences Only)
- [ ] Show 5 vibe sentences, no titles/posters/metadata
- [ ] User picks which movie they'd watch
- [ ] Reveal movie after choice
- [ ] Track hit rate: does vibe language predict satisfaction?

#### Mood Roulette
- [ ] Slot machine: 3 reels (emotional arc × watch context × wild card)
- [ ] Pull lever, see matching movies
- [ ] Shareable: "I got icarus + solo + devastating"

#### Emotional Journey Planner (Movie Marathon Builder)
- [ ] Draw emotional arc on VA graph
- [ ] App sequences 3-5 movies along that trajectory
- [ ] Presets: "Rainy Weekend", "Halloween Night", "Date Night Arc"
- [ ] Respects pacing transitions between films

#### Couples Movie Mediator
- [ ] Two players input mood independently (same color/vibe/emotion flow)
- [ ] App finds movie at intersection of both mood profiles
- [ ] Filtered by "date" watch context, comfort level, conversation potential

#### Vibe Search Engine
- [ ] Natural language input: "something that feels like a rainy Sunday"
- [ ] Semantic similarity against vibe sentences + mood tags
- [ ] Embedding model (transformers.js client-side or server-side)
- [ ] Ranked results with mood cards

---

## M5: Growth & Ecosystem

### Streaming Browser Extension
- [ ] Chrome extension overlaying mood data on Netflix/Prime/Disney+
- [ ] Hover: vibe sentence, comfort level, watch context, safety warnings

### Music-to-Movie Bridge
- [ ] Spotify OAuth: analyze recent listening mood
- [ ] Map Spotify valence/energy to movie VA space
- [ ] "Your music says you'd love these movies right now"

### Therapeutic Movie Guide
- [ ] Input: emotional goal ("processing grief", "need distraction")
- [ ] Filter by comfort level, safety warnings, eudaimonic valence, absorption
- [ ] Careful framing: "for self-care, not therapy"

### Movie Mood Embeddings (Developer Tool)
- [ ] Export 18-dim mood vectors as numpy/PyTorch tensors
- [ ] ML-ready format for recommendation models and research

### Mood Journal + Watch Tracker
- [ ] Daily mood logging (quick VA tap)
- [ ] Track movies watched, correlate with mood
- [ ] Reveal patterns: "You watch high-arousal content when stressed"
- [ ] Needs user accounts + persistent storage

---

## M6: Data Dashboard (`/dashboard`)
Interactive visualization of the Mooduel Movie Database.
- [ ] Mood Map: 2D scatter of all 30K movies in VA space (zoom, click, explore)
      Color by genre, decade, comfort level, or emotional arc
- [ ] Decade Mood Shifts: how cinema's emotional landscape changed over time
      1950s vs 1970s vs 2020s — average VA profiles per decade
- [ ] Genre Emotional Fingerprints: each genre's VA position and spread
      Comedy vs Horror vs Drama as mood distributions
- [ ] Comfort Spectrum: distribution of comfort levels, where do most movies cluster
- [ ] Arc Distribution: pie/bar of emotional arcs, change over time
- [ ] Pacing × Ending heatmap: which combos are common, which are rare
- [ ] Vibe Sentence Explorer: searchable, filterable, click to see full profile
- [ ] "Surprising" stats: most uncomfortable comedy, most comfortable horror,
      highest conversation potential animated film, etc.

---

## M7: Ship & Scale
- [ ] Vercel production deployment
- [ ] Custom domain (mooduel.com)
- [ ] SEO + social sharing (share winner movie card, mood profile card)
- [ ] Analytics (privacy-respecting: Plausible or Umami)
- [ ] Consulting offering page for streaming platforms

---

## M8: Cross-Media Mood Database
Extend mood classification beyond movies to all media.
Same LLM pipeline, adapted prompts, consistent core schema.
See `.ai/knowledge/cross-media-vision.md` for full design.

### Phase 1: TV Shows (~10-15K series)
- [ ] TMDB TV API (already available) + TVmaze for episode data
- [ ] Adapt classifier prompt for episodic structure
- [ ] Add: binge-ability, season arc shape, episode-vs-season mood
- [ ] Start with top 10K by TMDB popularity

### Phase 2: Video Games (~15-20K titles)
- [ ] IGDB + Steam reviews + Steam tags + RAWG API
- [ ] Adapt classifier for interactive media
- [ ] Add: agency, skill-emotion coupling, complicity, replayability
- [ ] Start with top 15K by review count

### Phase 3: Books (~20-30K titles)
- [ ] Open Library + Goodreads Kaggle + LibraryThing tags
- [ ] Adapt classifier for literary analysis
- [ ] Add: prose density, internal/external, re-readability
- [ ] Start with top 20K by Goodreads ratings count

### Phase 4: Music (~50K albums)
- [ ] Spotify Audio Features (valence/energy → VA mapping) + Last.fm tags
- [ ] Classify albums (not individual tracks) for emotional arcs
- [ ] Add: album arc shape, lyrical/instrumental split
- [ ] Spotify features give us partial VA for free — LLM enriches the rest

### Cross-Media Applications
- [ ] Mood Translation Engine: "I loved Blade Runner 2049, what book feels like that?"
- [ ] Universal Vibe Search: one search across all media by feeling
- [ ] Cross-Media Emotional Playlists: album → movie → game evening arcs
- [ ] Emotional Palette Mapping: where are the gaps in each medium?
- [ ] Media Metabolism Research: how do different media process the same emotions?
- [ ] → Beautiful Tree: cross-media resonance graph for matching people
