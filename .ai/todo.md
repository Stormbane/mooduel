# TODO

## M1: Playable Loop
- [ ] Initialize Next.js project with TypeScript, Tailwind v4, shadcn/ui, pnpm
- [ ] Set up TMDB API client (movies, people, images)
- [ ] Define core types: MovieProfile, Round, Pick, GameState
- [ ] Build MovieProfile update logic (genre weights, mood scores, people preferences)
- [ ] Build recommendation engine (candidate selection based on profile)
- [ ] **Round: Poster Pick** — show 3 posters, tap to choose
- [ ] **Round: Pick an Actor** — show 2-3 actors with filmography strip
- [ ] **Round: Pick a Director** — same as actors, with top movies
- [ ] **Round: Tournament Bracket** — 8→4→2→1, always the finale
- [ ] Game loop orchestrator (rotates round types, manages state)
- [ ] Debug side panel (real-time profile visualization, per-pick diffs)
- [ ] Winner screen (movie poster, synopsis, ratings, streaming links)
- [ ] Animations and transitions (round transitions, pick feedback, bracket drama)
- [ ] Mobile-first responsive layout
- [ ] No landing page — game starts immediately on page load

## M2: Polish & Persistence
- [ ] **Round: Speed Round** — rapid-fire posters with timer
- [ ] **Round: Vibe Check** — mood words / colors / scene stills
- [ ] Set up Supabase project and schema
- [ ] Anonymous session storage (localStorage)
- [ ] Supabase Auth (anonymous → account upgrade)
- [ ] Sync localStorage sessions to Supabase on account creation
- [ ] Session history page
- [ ] Implicit signal capture (dwell time, hesitation)
- [ ] Mobile polish and animations

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
