# Mooduel: Movie Mood Discovery Through Play

[![HuggingFace Dataset](https://img.shields.io/badge/HuggingFace-mooduel--v1.0-yellow)](https://huggingface.co/datasets/fractalintelligence/mooduel-v1.0)
[![License: MIT](https://img.shields.io/badge/Code-MIT-blue.svg)](LICENSE)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/Data-CC_BY--NC_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Movies](https://img.shields.io/badge/Movies-30%2C611-E91E8C)](https://huggingface.co/datasets/fractalintelligence/mooduel-v1.0)
[![Dimensions](https://img.shields.io/badge/Mood_Dimensions-18-8B5CF6)](https://huggingface.co/datasets/fractalintelligence/mooduel-v1.0)

**Mooduel** is an open-source game that reads your mood through play and matches you to movies using psychology, backed by the first open dataset of structured movie mood profiles.

No ratings. No forms. Just vibes.

## What it is

Mooduel is two things in one repo:

1. **A playful mood-detection app.** You play short games (pick a colour, react to a painting, swipe through vibes) and the app builds a live profile of your current emotional state. Then it matches that profile against 30,000+ movies and runs a tournament bracket so you finish with one film picked for the mood you're actually in, not the mood you wish you were in.

2. **An open psychology dataset.** Every movie in the database is scored across 18 dimensions drawn from affect research (PAD, Russell's circumplex), media psychology (Zillmann's MMT, Oliver & Bartsch hedonic/eudaimonic/psychologically-rich), and narrative theory (Reagan emotional arcs, Plutchik). Scored once by Claude Haiku 4.5 from plot, reviews, and crowd tags. Continuously refined by the community.

The dataset powers the app. The app generates feedback that improves the dataset. Both ship together under open licenses so anyone can use either piece for research, recommenders, or their own experiments.

## The Dataset

The **Mooduel Movie Database** contains mood profiles for **30,611 movies** spanning 1888–2026. Every movie is scored across **18 psychological dimensions** using LLM classification from plot summaries, critic reviews, and crowd-sourced tags.

### Quick Start

The dataset is on HuggingFace at [`fractalintelligence/mooduel-v1.0`](https://huggingface.co/datasets/fractalintelligence/mooduel-v1.0).

```bash
pip install huggingface-hub
huggingface-cli download fractalintelligence/mooduel-v1.0 \
  mooduel-v1.0.jsonl --repo-type dataset --local-dir .
```

```python
import json

with open("mooduel-v1.0.jsonl") as f:
    movies = [json.loads(line) for line in f]

# Find the most comforting horror movie
horrors = [m for m in movies if "Horror" in m.get("genres", [])]
comfiest = max(horrors, key=lambda m: m.get("comfort_level", 0))
print(comfiest["title"], comfiest["comfort_level"])
```

Or via the `datasets` library:

```python
from datasets import load_dataset
ds = load_dataset("fractalintelligence/mooduel-v1.0", split="train")
```

### Schema (18 Dimensions)

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `valence` | number | -1 to +1 | Pleasure–displeasure of viewing experience |
| `arousal` | number | -1 to +1 | Calm–intense activation level |
| `dominance` | number | -1 to +1 | Overwhelming–empowering viewer agency |
| `absorption` | number | 0–1 | How cognitively consuming (Zillmann MMT) |
| `hedonic` | number | 0–1 | Fun, pleasure, entertainment value |
| `eudaimonic` | number | 0–1 | Meaning, insight, being moved |
| `psych_rich` | number | 0–1 | Novelty, complexity, perspective-broadening |
| `emotional_arc` | enum | 6 shapes | rags-to-riches, riches-to-rags, man-in-a-hole, icarus, cinderella, oedipus (Reagan et al.) |
| `dominant_emotions` | string[] | 2–3 | Top emotions from Plutchik's wheel |
| `mood_tags` | string[] | 3–6 | Thematic tags for semantic matching |
| `watch_context` | enum[] | 1–3 | Best setting: solo, date, friends, family |
| `vibe_sentence` | string | ≤12 words | What watching this movie *feels* like |
| `pacing` | enum | 5 types | slow-burn, building, steady, relentless, episodic |
| `ending_type` | enum | 7 types | triumphant, bittersweet, devastating, ambiguous, twist, uplifting, unsettling |
| `comfort_level` | number | 0–1 | Emotional safety: cozy vs. transgressive |
| `safety_warnings` | string[] | 0–3 | Content that could blindside vulnerable viewers |
| `conversation_potential` | number | 0–1 | How much people want to discuss it after |

The classifier also produces an 18th field, `reasoning` (a short scoring
rationale per movie), which is retained internally but not part of the
published dataset.

**Known v1.0 quirk:** a small fraction of rows (~4%) contain
out-of-vocabulary enum values (for example, pacing words appearing in
`emotional_arc`). These are being normalized for v1.0.1 — validate enum
fields against the lists above if your use case is strict.

### Sample Vibe Sentences

> *"Quiet resilience meeting hope; freedom earned through patient faith."* (The Shawshank Redemption)

> *"Ancestral horror wearing family's face; descent into madness you cannot stop."* (Hereditary)

> *"Sensory overload collapsing into quiet, hard-won grace."* (Everything Everywhere All at Once)

> *"Seductive darkness wrapped in silk and blood, power's slow poison."* (The Godfather)

## The Games

Mooduel ships with the core **Mooduel** game: full mood detection (colour, art, emotion prompts) feeding a tournament bracket that narrows 30K movies down to one pick.

Other game formats are in development and will land post-launch: Blind Taste Test (vibe sentences, no titles), Mood Roulette (slot machine of arc × context × wild card), Mood Mirror (rapid binary choices to your emotional fingerprint), Comfort Zone (tolerance calibration), Couples (two profiles, one movie), Mood DJ (build a vibe sequence). See `.ai/todo.md` for the roadmap.

## Explore & Dashboard

- `/explore`: search and filter the full 30K-movie database, full mood card per film
- `/dashboard`: live charts of the dataset (VA scatter, dimension distributions, decade shifts)
- `/leaderboard`: top community contributors by reputation
- `/profile`: your corrections, votes, and reputation history

## Community Calibration

Mood scoring is hard and a single LLM pass is never the final word. Mooduel ships with a built-in correction system:

- Sign in with GitHub or Google
- On any movie card, suggest a correction to any of the 18 dimensions
- Other users upvote or downvote your suggestion
- Once a correction reaches a net score of +3 it's auto-accepted, applied to the database, and the contributor earns reputation
- Voters who backed accepted corrections also earn reputation

The goal is a dataset that gets sharper with every player, not a static snapshot frozen at the moment the LLM ran.

## Methodology

### Data Pipeline

1. **TMDB metadata**: 30,611 movies with genres, ratings, keywords, runtime
2. **Wikipedia plots**: plot summaries for 16,197 movies (52.9%)
3. **Rotten Tomatoes reviews**: critic reviews for 12,656 movies from Kaggle
4. **TMDB user reviews**: fallback reviews for 3,485 additional movies
5. **MovieLens Tag Genome**: 1,128 crowd-sourced tags for 8,815 movies
6. **TMDB certifications**: MPAA ratings for 21,610 movies (70.6%)
7. **LLM classification**: all sources fed to Claude Haiku 4.5 with structured JSON output

### Theoretical Foundation

- **Core Affect**: Russell's Circumplex Model + PAD (valence, arousal, dominance)
- **Absorption**: Zillmann's Mood Management Theory
- **Experience Types**: Oliver & Bartsch 2010 (hedonic, eudaimonic, psychologically rich)
- **Emotional Arcs**: Reagan et al. 2016 (six fundamental story shapes)
- **Discrete Emotions**: Plutchik's Wheel of Emotions

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion, CSS transitions, IntersectionObserver |
| Database | Supabase (Postgres): movies, profiles, corrections, votes, reputation |
| Auth | Supabase Auth (GitHub + Google OAuth) |
| Charts | Recharts |
| Classifier | Claude Haiku 4.5 (Anthropic Batch API) |
| Tests | Playwright |

## Run Locally

```bash
git clone https://github.com/Stormbane/mooduel.git
cd mooduel
npm install
cp .env.example .env.local  # add TMDB read access token + Supabase URL/keys
npm run dev
```

You'll need a Supabase project for the movie database, auth, and corrections to work. Migrations live in `supabase/all_migrations.sql`. Seed scripts are in `scripts/`.

## Citation

```bibtex
@dataset{mooduel_2026,
  author    = {Basak, Sutirtha and Mooduel contributors},
  title     = {Mooduel: A Movie Mood Dataset Across 18 Psychological Dimensions},
  year      = {2026},
  publisher = {Fractal Intelligence},
  version   = {1.0},
  url       = {https://huggingface.co/datasets/fractalintelligence/mooduel-v1.0}
}
```

## License

- **Code**: MIT
- **Dataset** (mood scores): CC-BY-NC-4.0. Free for research and personal use, attribution required. Commercial use requires a separate license.
- **Movie metadata**: sourced from TMDB, Wikipedia, Rotten Tomatoes (Kaggle), MovieLens, subject to their respective licenses.

## Contributing

Contributions welcome, whether improving the classifier prompt, adding new mood dimensions, building new games, or fixing bugs. Open an issue or PR.

---

Built by [Sutirtha Basak](https://github.com/Stormbane) with [Claude](https://claude.ai).
