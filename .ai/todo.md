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
- [ ] **Top up Anthropic API credits**
- [ ] Run batch classification (30K movies via Haiku, ~$15-40)
- [ ] Validate: spot-check 100 random scores, distribution sanity
- [ ] Quality report: histograms per dimension, outlier detection

### Phase 3: Integration with Mooduel Game
- [ ] `src/lib/mood-data/` — load mood scores from static JSON
- [ ] `src/lib/engine/candidates.ts` — score movies using VA when available
- [ ] `src/hooks/use-game.ts` — load mood scores, pass to scoring
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

## M3: Release — Landing + Explore + About

### Landing Page (`/`)
- [ ] Hero: tagline + Play CTA + Explore Dataset CTA
- [ ] Animated demo loop of game flow
- [ ] "How It Works" — 3-step visual (vibes → movies → tournament)
- [ ] "The Science" — circumplex diagram, Zillmann, 18 dimensions
- [ ] "The Dataset" — stats bar + scrolling vibe sentences
- [ ] Trust block: GitHub stars, movie count, open source badge

### Explore Page (`/explore`) — Mooduel Movie DB
- [ ] Search by title (instant, client-side over static JSON)
- [ ] Filter by mood (VA sliders, comfort level, pacing, ending type)
- [ ] Filter by watch context (solo / date / friends / family)
- [ ] Browse by vibe (scrollable vibe sentences, click to explore similar)
- [ ] Mood map: interactive 2D scatter (valence × arousal), all movies as dots
- [ ] Full mood card: all 18 dimensions visualised for a single movie
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

## M4: More Games

### Mood Drift (Daily Game — Wordle for Movies)
- [ ] Daily target mood profile (hidden VA + arc)
- [ ] 6 guesses: name a movie, see distance to target
- [ ] Shareable results grid ("Hereditary → Paddington in 4 moves")
- [ ] Daily reset, streak tracking

### Blind Taste Test (Vibe Sentences Only)
- [ ] Show 5 vibe sentences, no titles/posters/metadata
- [ ] User picks which movie they'd watch
- [ ] Reveal movie after choice
- [ ] Track hit rate: does vibe language predict satisfaction?

### Mood Roulette
- [ ] Slot machine: 3 reels (emotional arc × watch context × wild card)
- [ ] Pull lever, see matching movies
- [ ] Shareable: "I got icarus + solo + devastating"

### Emotional Journey Planner (Movie Marathon Builder)
- [ ] Draw emotional arc on VA graph
- [ ] App sequences 3-5 movies along that trajectory
- [ ] Presets: "Rainy Weekend", "Halloween Night", "Date Night Arc"
- [ ] Respects pacing transitions between films

### Couples Movie Mediator
- [ ] Two players input mood independently (same color/vibe/emotion flow)
- [ ] App finds movie at intersection of both mood profiles
- [ ] Filtered by "date" watch context, comfort level, conversation potential

### Vibe Search Engine
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
