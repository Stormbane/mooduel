# Project Specification

## Vision

Movie Picker is an interactive movie recommendation app that discovers what you're in the mood for through play, not interrogation. Instead of filling out preference forms, users are dropped straight into a sequence of visual games — picking posters, actors, directors — while the system builds an implicit taste profile that converges on their current mood. The game IS the product. No landing page, no onboarding forms. You arrive, you play, you get your movie.

## Why This Exists

Movie Picker is a **research prototype for Beautiful Tree's recommendation engine**. The real goals:

1. **Learn to build recommender systems** — understand how to correctly predict user preference
   through implicit signals (play, not forms) so we can serve the right next question on
   Beautiful Tree.

2. **Explore the media→values→beliefs pipeline** — a person's movie and book preferences reveal
   something about their ideals, values, and worldview. If we can extract that signal, Beautiful
   Tree could ask "what movies do you love?" and use the answer to find people who sit close to
   your branch on the belief tree. Media taste as a proxy for epistemic style and values alignment.

3. **Build a reusable preference-elicitation-through-play pattern** — the game mechanic itself
   (pick, compare, bracket) is transferable to any domain where you need to surface latent
   preferences without interrogation.

Everything built here — the mood engine, the Zillmann mix, the implicit profiling, the mood
dataset — is dual-purpose: it makes Movie Picker work as a product, AND it feeds directly into
Beautiful Tree's matching and question-serving architecture.

## Users

- **Anyone picking a movie tonight** — the casual "what should we watch?" crowd
- **Anonymous by default** — no signup required to play
- **Account optional** — create an account to save history, reclaim past sessions, and get better recommendations over time
- Primarily mobile-first (couch + phone), but works on desktop too

## The Game Flow

The experience is a sequence of rounds: 3 abstract mood-detection rounds followed by
6 mood-guided poster-pick rounds and a tournament bracket. Each round is high-stimulation
with satisfying animations. The data from every interaction feeds the evolving MovieProfile.

### Round Types

1. **Color Pick** (Round 0) — Abstract color palette selection. Brightness/saturation → VA baseline.
2. **Vibe Pick** (Round 1) — Abstract art from Art Institute of Chicago. Emotional resonance → VA refinement.
3. **Emotion Pick** (Round 2) — Yale Mood Meter grid (80 emotions). Explicit label → VA confirmation.
4. **Poster Pick** (Rounds 3-8) — Show 5 movie posters with synopsis. Mood-guided selection using
   Zillmann mix (matching + adjacent + contrasting). 6 rounds with progressively broader discovery.
5. **Tournament Bracket** — ALWAYS the finale. Top 8 candidates battle in head-to-head matchups
   down to a winner.

### Flow Structure
```
Splash: Science-backed mood discovery explainer
  → Round 0-2: Mood detection (color, vibe, emotion)
  → Round 3-8: Poster picks (6 rounds, Zillmann mood-guided mix)
  → Tournament: 8→4→2→1 bracket
  → Winner screen: YOUR MOVIE TONIGHT with poster, details, where to watch
```

### Mood Management (Zillmann's MMT)

The system tracks whether the user is **deepening** (seeking mood-matching content) or
**reversing** (seeking mood-contrasting content) based on their picks. The movie mix
adapts accordingly:
- Default: 60% matching, 20% adjacent, 20% contrasting
- Deepening: 80% matching, 20% adjacent
- Reversing: 40% matching, 20% adjacent, 40% contrasting

### Movie Mood Dataset

Per-movie mood classification using LLM analysis of plot summaries and critic reviews.
50K movies classified across 10 dimensions:
- **Core affect:** valence, arousal, dominance (circumplex model + PAD)
- **Absorption potential:** cognitive consumption level (Zillmann's third property)
- **Three experience valences:** hedonic, eudaimonic, psychologically rich (Oliver & Bartsch + Wirz & Eden)
- **Emotional arc:** one of six fundamental story shapes (Reagan et al.)
- **Discrete emotions:** top 2-3 from Plutchik's wheel
- **Mood tags:** thematic tags for semantic affinity matching

### Debug Side Panel
- Visible throughout the game (collapsible on mobile)
- Shows MovieProfile in real-time: genre weights, mood scores, era preferences
- Visualizes how each pick shifts the profile (before/after diff)
- Shows the engine's reasoning for candidate selection each round

## Features

### Core
- **Science-backed mood detection**: 3 abstract rounds (color, art, emotion) map user mood to VA space
- **Mood-guided discovery**: 6 poster rounds with Zillmann mix (matching + contrasting)
- **Adaptive mood management**: System learns whether user wants to deepen or reverse their mood
- **Per-movie mood scores**: LLM-classified dataset (50K movies, 10 dimensions)
- **Implicit profile building**: Every tap feeds the recommendation engine
- **Debug panel**: Real-time profile + mood regulation visualization
- **Winner screen**: Final movie recommendation with poster, synopsis, ratings

### Persistence (M2+)
- **Anonymous sessions**: Play without signing up; session data stored locally
- **Account creation**: Claim anonymous session data when creating an account
- **History**: Past sessions, picks, and final recommendations saved to profile
- **Evolving taste profile**: Long-term preference model that improves across sessions

## Milestones

### M1: Playable Loop ✅
- Poster Pick (5 per round), cyberpunk gameshow UI
- Actor/Director rounds (removed in M2)
- Tournament Bracket, winner screen, debug panel
- Framer-motion animations, Playwright tests

### M2: Mooduel — Mood Engine + Zillmann MMT
- Remove actor/director rounds → 6 poster-pick rounds
- Movie Mood Dataset: LLM classification of 50K movies (open data)
- Broader movie pool via mood-guided TMDB discover
- Zillmann mood management: adaptive matching/contrasting mix
- Landing page with science explainer

### M3: Smart Recommendations
- Active learning (pick most informative candidates per round)
- Long-term taste profile across sessions
- Social features (share bracket, taste match)
- "Play again" with memory of past sessions

### M4: Ship It
- Custom domain, production deployment on Vercel
- Open source release
- SEO / social sharing (share your winner movie)
