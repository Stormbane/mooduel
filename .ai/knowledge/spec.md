# Project Specification

## Vision

Movie Picker is an interactive movie recommendation app that discovers what you're in the mood for through play, not interrogation. Instead of filling out preference forms, users are dropped straight into a sequence of visual games — picking posters, actors, directors — while the system builds an implicit taste profile that converges on their current mood. The game IS the product. No landing page, no onboarding forms. You arrive, you play, you get your movie.

It's a prototype for preference-elicitation-through-play, with future application to question recommendation in Beautiful Tree.

## Users

- **Anyone picking a movie tonight** — the casual "what should we watch?" crowd
- **Anonymous by default** — no signup required to play
- **Account optional** — create an account to save history, reclaim past sessions, and get better recommendations over time
- Primarily mobile-first (couch + phone), but works on desktop too

## The Game Flow

The experience is a sequence of mini-games that rotate through different mechanics. Each round is high-stimulation with satisfying animations. The data from every interaction feeds the same evolving MovieProfile.

### Round Types (rotate through these)

1. **Poster Pick** — Show 2-3 movie posters, tap your favorite
2. **Speed Round** — Rapid-fire posters, 2-3 seconds each, tap = yes, let it pass = no
3. **Pick an Actor** — Show 2-3 actors (with a strip of their top movies underneath), tap your pick
4. **Pick a Director** — Same format as actors, with their filmography
5. **Vibe Check** — Pick from mood words, colors, or scene stills (not movies) to capture emotional state
6. **Tournament Bracket** — ALWAYS the finale. Top 8 candidates from the evolved profile battle in head-to-head matchups down to a winner

### Flow Structure
```
Landing = Round 1 (no splash screen, no intro — just posters)
  → Rotate through round types (5-8 rounds total)
  → Each round: pick, animate, show profile shift in debug panel
  → Final round: Tournament Bracket (8 → 4 → 2 → 1)
  → Winner screen: YOUR MOVIE TONIGHT with poster, details, where to watch
```

### Debug Side Panel
- Visible throughout the game (collapsible on mobile)
- Shows MovieProfile in real-time: genre weights, mood scores, era preferences
- Visualizes how each pick shifts the profile (before/after diff)
- Shows the engine's reasoning for candidate selection each round

## Features

### Core
- **Zero-friction entry**: URL → playing in < 1 second
- **Rotating game mechanics**: Different round types keep it stimulating
- **Implicit profile building**: Every tap feeds the recommendation engine
- **Debug panel**: Real-time profile visualization (dev mode / toggle)
- **Winner screen**: Final movie recommendation with poster, synopsis, ratings

### Persistence (M2+)
- **Anonymous sessions**: Play without signing up; session data stored locally
- **Account creation**: Claim anonymous session data when creating an account
- **History**: Past sessions, picks, and final recommendations saved to profile
- **Evolving taste profile**: Long-term preference model that improves across sessions

## Milestones

### M1: Playable Loop
- Drop user straight into game on page load
- Poster Pick rounds (pick from 3) with TMDB data
- Pick an Actor / Pick a Director rounds
- Basic MovieProfile building (genre weights, mood scores, people preferences)
- Engine selects next round's candidates based on evolving profile
- Tournament Bracket finale (8 → 1)
- Winner screen with movie details
- Debug side panel showing profile evolution
- Satisfying animations and transitions between rounds
- No auth, no persistence — just the game

### M2: Polish & Persistence
- Speed Round and Vibe Check game modes
- Anonymous sessions with local storage
- Supabase auth (anonymous → claimed account)
- Session history saved to database
- Mobile-first responsive polish
- Implicit signal capture (dwell time, hesitation)

### M3: Smart Recommendations
- Active learning (pick most informative candidates per round)
- Long-term taste profile across sessions
- Social features (share bracket, taste match)
- "Play again" with memory of past sessions

### M4: Ship It
- Custom domain, production deployment on Vercel
- Open source release
- SEO / social sharing (share your winner movie)
