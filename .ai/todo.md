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

## M6: Ship & Scale
- [ ] Vercel production deployment
- [ ] Custom domain (mooduel.com)
- [ ] SEO + social sharing (share winner movie card, mood profile card)
- [ ] Analytics (privacy-respecting: Plausible or Umami)
- [ ] Consulting offering page for streaming platforms
