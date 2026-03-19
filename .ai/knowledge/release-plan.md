# Mooduel Release Plan

## The Novel Contribution

No existing dataset maps whole movies to structured mood profiles at scale.
Existing emotion datasets work at utterance level (subtitle lines, review sentences).
Mooduel provides movie-level mood across 18 psychological dimensions for 30K+ films.
That's the thing to lead with.

---

## Site Structure

```
/                   → Landing page (hero + game CTA + dataset CTA)
/play               → The Mooduel game
/explore            → Search/browse the Mooduel Movie DB
/about              → Research methodology, mood science, team, credits
/about/dataset      → Dataset documentation, schema, download links
/donate             → Buy Me a Coffee / GitHub Sponsors
```

---

## 1. Landing Page (`/`)

**Hero**: Big statement + two CTAs
- Tagline: "Find your movie through mood, not search"
- Primary CTA: **Play Mooduel** → `/play`
- Secondary CTA: **Explore the Dataset** → `/explore`
- Animated demo: short loop of the game flow

**How It Works**: 3-step visual
1. Pick vibes (color → art → emotion)
2. Choose movies (mood-matched candidates)
3. Tournament bracket → your perfect movie

**The Science**: Brief — circumplex model diagram, Zillmann reference,
"18 mood dimensions per movie". Link to `/about` for depth.

**The Dataset**: Stats bar (30K+ movies, 18 dimensions, 5 data sources)
+ scrolling vibe sentences. "Download on HuggingFace" button.

**Trust block**: GitHub stars, movie count, "open source + open data"

---

## 2. Explore Page (`/explore`)

Searchable movie mood database. The data becomes a product.

Features:
- **Search by title** — find any movie's full mood profile
- **Filter by mood** — VA sliders, comfort level, pacing, ending type
- **Filter by watch context** — "date night", "solo", "friends", "family"
- **Browse by vibe** — scrollable vibe sentences, click to explore similar
- **Mood map** — interactive 2D scatter (valence × arousal) with all movies as dots
- **Full mood card** — all 18 dimensions visualised for a single movie

Implementation: serve client-side from static JSON (~15-20MB gzipped).
No backend needed. Fast, free, no API.

---

## 3. About Page (`/about`)

Sections:
- **What is Mooduel** — the game + the dataset, one paragraph each
- **The Mood Model** — circumplex diagram, VA/D, absorption, three valences, arcs
- **Our Dimensions** — table of all 18 fields with descriptions and anchor examples
- **Methodology** — data pipeline (TMDB → Wikipedia → RT → MovieLens → LLM classification)
- **Prompt design** — how we built and validated the classifier
- **The Dataset** (`/about/dataset`) — schema, downloads, HuggingFace card, license, BibTeX
- **Open Source** — GitHub link, tech stack, how to contribute
- **Team** — credits

---

## 4. Data Distribution

**Model**: Static versioned downloads (like MovieLens). No API at launch.
- Zero hosting cost (GitHub Releases / HuggingFace)
- Reproducible for researchers (versioned snapshots)
- No rate limiting headaches

**Formats**:
- `mooduel-v1.0.json` — full dataset, one JSON array
- `mooduel-v1.0.csv` — flat CSV for pandas/Excel users
- `mooduel-v1.0.parquet` — compressed columnar for ML pipelines

**Hosts**: HuggingFace Datasets (primary, discoverable) + GitHub Releases (backup)

**License**: CC-BY-NC-4.0 — free for research/personal, attribution required,
commercial use needs separate license.

---

## 5. Monetisation Stack

### Immediate (day one)
- **GitHub Sponsors** — FUNDING.yml, tiered ($5/$15/$50/month)
- **Buy Me a Coffee** — button on landing page + donate page
- **Streaming affiliate links** — winner screen shows "Watch on Netflix/Prime/etc"
  via JustWatch deeplinks. Disney+ pays up to $11/signup, Apple 7% commission.
  Zero cost to add, scales with traffic.

### Medium-term
- **Commercial license** — $500-2,000 for companies using mood data in products
- **Freemium API** — only if demand warrants. Free 100 req/day, paid for commercial.

### Long-term
- **Consulting** — custom mood analysis for streaming platforms ($150-250/hr)
- **Sponsored annotations** — streaming services pay for catalog prioritisation

---

## 6. GitHub README Structure

```
[Banner image]
[Badges: license, movies, dimensions, HuggingFace, stars]

# Mooduel — Movie Mood Discovery Through Play

[Demo GIF of game flow]

## What is this?
## Quick Start (dataset)
## The Dataset (schema table, sample rows, download links)
## The Game (how to run locally)
## Methodology (brief, links to /about)
## Citation (BibTeX + CITATION.cff)
## License (CC-BY-NC-4.0 data, MIT code)
## Contributing
```

---

## 7. Build Order

1. Explore page — searchable movie DB (most novel user-facing feature)
2. Landing page — hero + CTAs
3. About page — methodology + dataset docs
4. README + CITATION.cff — GitHub presentation
5. HuggingFace upload — dataset distribution
6. Monetisation — FUNDING.yml, BMC button, affiliate links
7. Donate page
