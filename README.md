# Mooduel — Movie Mood Discovery Through Play

[![License: MIT](https://img.shields.io/badge/Code-MIT-blue.svg)](LICENSE)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/Data-CC_BY--NC_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Movies](https://img.shields.io/badge/Movies-30%2C611-E91E8C)](https://github.com/Stormbane/mooduel)
[![Dimensions](https://img.shields.io/badge/Mood_Dimensions-18-8B5CF6)](https://github.com/Stormbane/mooduel)

**Mooduel** is an open-source game that reads your mood through play and matches you to movies using psychology — backed by the first open dataset of structured movie mood profiles.

No ratings. No forms. Just vibes.

## The Dataset

The **Mooduel Movie Database** contains mood profiles for **30,611 movies** spanning 1888–2026. Every movie is scored across **18 psychological dimensions** using LLM classification from plot summaries, critic reviews, and crowd-sourced tags.

### Quick Start

```python
import json

with open("data/movie-mood-scores.jsonl") as f:
    movies = [json.loads(line) for line in f]

# Find the most comforting horror movie
horrors = [m for m in movies if "Horror" in m.get("genres", [])]
comfiest = max(horrors, key=lambda m: m.get("comfortLevel", 0))
print(f"{comfiest['title']} — comfort: {comfiest['comfortLevel']}")
# Dracula: Dead and Loving It — comfort: 0.88
```

```javascript
// Node.js
const movies = require("./data/movie-mood-scores.json");

// Find movies for a quiet solo night
const quiet = movies
  .filter(m => m.watchContext.includes("solo") && m.arousal < 0 && m.comfortLevel > 0.6)
  .sort((a, b) => b.eudaimonicValence - a.eudaimonicValence)
  .slice(0, 5);
```

### Schema (18 Dimensions)

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `valence` | number | -1 to +1 | Pleasure–displeasure of viewing experience |
| `arousal` | number | -1 to +1 | Calm–intense activation level |
| `dominance` | number | -1 to +1 | Overwhelming–empowering viewer agency |
| `absorptionPotential` | number | 0–1 | How cognitively consuming (Zillmann MMT) |
| `hedonicValence` | number | 0–1 | Fun, pleasure, entertainment value |
| `eudaimonicValence` | number | 0–1 | Meaning, insight, being moved |
| `psychologicallyRichValence` | number | 0–1 | Novelty, complexity, perspective-broadening |
| `emotionalArc` | enum | 6 types | Story shape (man-in-a-hole, icarus, etc.) |
| `dominantEmotions` | string[] | 2–3 | Top emotions from Plutchik's wheel |
| `moodTags` | string[] | 3–6 | Thematic tags for semantic matching |
| `watchContext` | enum[] | 1–3 | Best setting: solo, date, friends, family |
| `vibeSentence` | string | ≤12 words | What watching this movie *feels* like |
| `pacing` | enum | 5 types | slow-burn, building, steady, relentless, episodic |
| `endingType` | enum | 7 types | triumphant, bittersweet, devastating, ambiguous, twist, uplifting, unsettling |
| `comfortLevel` | number | 0–1 | Emotional safety: cozy vs. transgressive |
| `emotionalSafetyWarnings` | string[] | 0–3 | Content that could blindside vulnerable viewers |
| `conversationPotential` | number | 0–1 | How much people want to discuss it after |

### Sample Vibe Sentences

> *"Quiet resilience meeting hope; freedom earned through patient faith."* — The Shawshank Redemption

> *"Ancestral horror wearing family's face; descent into madness you cannot stop."* — Hereditary

> *"Sensory overload collapsing into quiet, hard-won grace."* — Everything Everywhere All at Once

> *"Seductive darkness wrapped in silk and blood — power's slow poison."* — The Godfather

## The Games

| Game | What it does |
|------|-------------|
| **Mooduel** | Full mood detection (color → art → emotion) + movie picks + tournament bracket |
| **Blind Taste Test** | 5 vibe sentences, no titles — pick blind, reveal the movie |
| **Mood Roulette** | Spin 3 reels (arc × context × wild card), discover matching movies |
| **Mood Mirror** | 12 rapid binary choices → your emotional fingerprint + matched movies |

## Methodology

### Data Pipeline

1. **TMDB metadata** — 30,611 movies with genres, ratings, keywords, runtime
2. **Wikipedia plots** — plot summaries for 16,197 movies (52.9%)
3. **Rotten Tomatoes reviews** — critic reviews for 12,656 movies from Kaggle
4. **TMDB user reviews** — fallback reviews for 3,485 additional movies
5. **MovieLens Tag Genome** — 1,128 crowd-sourced tags for 8,815 movies
6. **TMDB certifications** — MPAA ratings for 21,610 movies (70.6%)
7. **LLM classification** — all sources fed to Claude Haiku 4.5 with structured JSON output

### Theoretical Foundation

- **Core Affect**: Russell's Circumplex Model + PAD (valence, arousal, dominance)
- **Absorption**: Zillmann's Mood Management Theory
- **Experience Types**: Oliver & Bartsch 2010 (hedonic, eudaimonic, psychologically rich)
- **Emotional Arcs**: Reagan et al. 2016 (six fundamental story shapes)
- **Discrete Emotions**: Plutchik's Wheel of Emotions

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS v4, shadcn/ui |
| Animation | Framer Motion |
| Classifier | Claude Haiku 4.5 (Anthropic Batch API) |
| Language | TypeScript |

## Run Locally

```bash
git clone https://github.com/Stormbane/mooduel.git
cd mooduel
npm install
cp .env.local.example .env.local  # Add your TMDB API key
npm run dev
```

## Citation

```bibtex
@dataset{mooduel2026,
  title   = {Mooduel Movie Database: Structured Mood Profiles for 30K Films},
  author  = {Basak, Sutirtha},
  year    = {2026},
  url     = {https://github.com/Stormbane/mooduel},
  license = {CC-BY-NC-4.0}
}
```

## License

- **Code**: MIT
- **Dataset** (mood scores): CC-BY-NC-4.0 — free for research and personal use, attribution required, commercial use requires separate license
- **Movie metadata**: sourced from TMDB, Wikipedia, Rotten Tomatoes (Kaggle), MovieLens — subject to their respective licenses

## Contributing

Contributions welcome — whether improving the classifier prompt, adding new mood dimensions, building new games, or fixing bugs. Open an issue or PR.

---

Built by [Sutirtha Basak](https://github.com/Stormbane) with [Claude](https://claude.ai).
