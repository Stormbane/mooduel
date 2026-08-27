# Architecture

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 15 (App Router) | React Server Components where sensible |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS v4 | Utility-first |
| Components | shadcn/ui + 21st.dev | Copy-paste components, not dependencies |
| Auth | Supabase Auth | Anonymous sign-in → account upgrade (M2) |
| Database | Supabase (Postgres) | User profiles, session history, picks (M2) |
| Movie Data | TMDB API | Posters, metadata, genres, people, keywords |
| Deployment | Vercel | Edge functions if needed |
| Package Manager | pnpm | Fast, strict |

## Project Structure

```
src/
  app/                    — Next.js App Router pages
    page.tsx              — THE page. Game starts here. No routing needed for M1.
    layout.tsx            — Root layout
    api/
      tmdb/               — TMDB proxy endpoints (hide API key)
  components/
    ui/                   — shadcn/ui base components
    game/
      poster-pick.tsx     — Pick from 2-3 movie posters
      actor-pick.tsx      — Pick an actor (with filmography strip)
      director-pick.tsx   — Pick a director (with filmography strip)
      tournament.tsx      — 8→4→2→1 bracket finale
      winner-screen.tsx   — Final recommendation display
      debug-panel.tsx     — Real-time profile visualization
      round-transition.tsx — Animations between rounds
  lib/
    tmdb/
      client.ts           — TMDB API client
      types.ts            — TMDB response types
    engine/
      profile.ts          — MovieProfile creation and update logic
      candidates.ts       — Candidate selection (what to show next)
      game-flow.ts        — Round orchestration (which game type, when to bracket)
    types.ts              — Core domain types (MovieProfile, Round, Pick, GameState)
  hooks/
    use-game.ts           — Main game state hook
    use-profile.ts        — Profile state management
```

## Core Types

```typescript
type RoundType = 'poster-pick' | 'actor-pick' | 'director-pick' | 'tournament';

interface MovieProfile {
  genreWeights: Record<string, number>;    // genre name → 0-1 weight
  moodScores: Record<string, number>;      // mood tag → 0-1 score
  eraPreference: Record<string, number>;   // decade/era → 0-1
  peoplePreferences: {
    actors: Record<number, number>;        // TMDB person ID → affinity score
    directors: Record<number, number>;     // TMDB person ID → affinity score
  };
  picks: Pick[];
  // derived
  avgRating: number;
  avgPopularity: number;
}

interface Pick {
  movieId?: number;        // TMDB movie ID (for movie picks)
  personId?: number;       // TMDB person ID (for actor/director picks)
  roundType: RoundType;
  round: number;
  alternatives: number[];  // IDs of options not chosen
  implicit?: {
    dwellMs: number;       // time spent before choosing
    hesitations: number;   // number of times they hovered/touched another option
  };
}

interface GameState {
  currentRound: number;
  totalRounds: number;     // typically 5-8 before tournament
  roundType: RoundType;
  profile: MovieProfile;
  phase: 'playing' | 'tournament' | 'winner';
  tournamentBracket?: TournamentBracket;
}

interface TournamentBracket {
  rounds: TournamentRound[];
  currentMatchup: number;
  winner?: number;         // TMDB movie ID
}

interface TournamentRound {
  matchups: [number, number][];  // pairs of TMDB movie IDs
  winners: number[];
}
```

## Data Flow

```
User arrives at /
  → Game initializes with empty MovieProfile
  → Engine selects first round (Poster Pick with diverse popular movies)
  → User taps choice

Each pick:
  → Record pick (movie/person ID, round number, alternatives, implicit signals)
  → Update MovieProfile:
      - Boost selected item's genre/mood/era/people attributes
      - Slightly dampen rejected items' unique attributes
      - Normalize all weights
  → Debug panel animates the profile shift
  → Engine determines next round type and selects candidates:
      1. Rotate through round types (poster → actor → director → poster → ...)
      2. Query TMDB for candidates matching evolved profile
      3. Ensure diversity (don't repeat genres/people)
      4. Include one "exploration" candidate to prevent echo chamber

After 5-8 rounds:
  → Enter Tournament phase
  → Engine selects top 8 candidate movies based on final profile
  → Bracket: 8→4→2→1 with dramatic reveal animations
  → Winner screen: movie poster, synopsis, ratings, where to watch
```

### Profile Update Logic
Weights are normalized after each pick:
- **Movie pick**: selected movie's genres get +0.15, mood tags +0.1, era +0.1. Rejected movies' *unique* attributes (not shared with winner) get -0.05.
- **Actor/Director pick**: selected person gets +0.2 affinity. Their associated genres get a smaller +0.05 boost. Rejected people get -0.05.
- All weights clamped to [0, 1] and re-normalized within each category.

### Persistence Flow (M2)
```
Anonymous:  picks stored in localStorage → synced to Supabase on account creation
Logged in:  picks written to Supabase in real-time
```

## API Design

### Internal API Routes (proxy TMDB, hide API key)
- `GET /api/tmdb/discover` — Discover movies with profile-based filters
- `GET /api/tmdb/movie/[id]` — Movie details + credits
- `GET /api/tmdb/person/[id]` — Person details + filmography
- `GET /api/tmdb/popular-people` — Popular actors/directors for people rounds

### TMDB API Usage
- **Discover Movies** — candidate generation with genre/year/rating filters
- **Movie Details** — rich metadata (genres, keywords, overview, ratings)
- **Movie Credits** — cast and crew for a movie
- **Person Details** — actor/director info + photo
- **Person Movie Credits** — filmography for actor/director display
- **Genre List** — mapping IDs → names
- **Image CDN** — posters (w500, w780), profile photos (w185, h632)

### Supabase Schema (M2)
```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  created_at timestamptz default now(),
  profile jsonb,
  status text default 'active'
);

create table picks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions,
  round int,
  round_type text,
  picked_id int,             -- TMDB movie or person ID
  alternatives int[],
  implicit_signals jsonb,    -- dwell time, hesitations
  profile_snapshot jsonb,
  created_at timestamptz default now()
);

create table user_profiles (
  user_id uuid primary key references auth.users,
  long_term_profile jsonb,
  updated_at timestamptz default now()
);
```

## Calibration Platform (added 2026-07-17)

Full design + two-round Codex review log: `calibration-replatform-plan.md`.
Core idea: games are calibration engines — every play is a label.

### Data provenance
- `data/movie-mood-scores.jsonl` — canonical classifier output, never mutated
- `data/patches/` — enum-repair ledger (mechanical + LLM), materialized maps
- `score_patches` (supabase/003) — the ledger in DB, service-role writes only
- `movie_scores_baseline` (supabase/003) — immutable normalized LLM prior
- `data/movie-enrichment.jsonl` — posters + RT/IMDB snapshot; with the
  canonical JSONL, `scripts/seed-movies.ts` rebuilds the movies table from
  repo artifacts alone
- `scripts/export-dataset.ts --version X.Y.Z` — snapshot-bound release with
  sha256 manifest; refuses to clobber existing versions

### Signal pipeline (supabase/004, 006)
- `assignments` — server-dealt comparisons (session + IP caps in the RPC)
- `calibration_signals` — append-only; deny-by-default RLS both tables
- `submit_signal(assignment_id, client_event_id, choice, session, user)` —
  the only write path; context copied from the locked assignment, latency
  server-computed, idempotent on client_event_id
- Routes: `/api/games/session` (signed httpOnly anon sessions),
  `/api/games/pair`, `/api/games/signal` — service-role only; the RPCs are
  revoked from anon/authenticated
- Client: `src/lib/games/client/signals.ts` — fire-and-forget emitter,
  idempotent retry, pagehide beacon

### Aggregation + promotion (supabase/005, scripts/calibration/)
- `bt.mjs` — regularized Bayesian Bradley-Terry, PAVA isotonic anchor
  mapping, precision-based shrinkage (zero votes → prior untouched),
  categorical majority. Synthetic test: `test-bt.mjs` (rho=0.976 recovery)
- `aggregate.mjs run` — writes complete immutable runs to
  `calibration_runs` + `movie_scores_calibrated` (PK run_id, movie_id);
  never touches serving columns
- `promote_calibration_run()` — advisory-locked, set-equality proven both
  directions, row-count asserted, single transaction
- `.github/workflows/calibration.yml` — weekly unpromoted runs; promotion
  is manual until the shadow gate passes

### PvP skeleton (supabase/006)
- `matches` / `match_players` / `match_secrets` / `match_moves`
- `match_secrets` has NO RLS policies in any direction — hands are never
  client-readable; players see their own via `get_hand()` through
  service-role routes
- `create_match` / `join_match` (single-claim invite, one-identity-one-seat)
  / `submit_move` (turn + optimistic version + idempotency + deadline
  forfeit) / `forfeit_match`
- Game rules (dealing, trick resolution, scoring) intentionally NOT here —
  they belong to the Phase 4 game build

## Mood-Space Structure (added 2026-08-16)

Factor analysis over the full v1.0 dataset (30,611 movies, PCA + varimax;
`scripts/mood-factors.py`) shows the numeric dimensions collapse to
**Warmth × Depth × Intensity** (~90% of variance). Full finding, factor
loadings, anchor exemplars, and the calibration-game implications:
`.ai/knowledge/mood-space-factor-structure.md`. Design consequences for
this codebase:

- **Duel questions should target factors, not raw dimensions** — felt
  questions ("which would you put on when you're fragile?") map to F1/F2/F3;
  per-axis Bradley-Terry updates plug into the existing `bt.mjs` pipeline
  unchanged.
- **Anchor duels**: factor-extreme exemplars serve as fixed poles for
  absolute placement of uncertain movies.
- **Odd-one-out triads** are the axis-discovery instrument (no axis named;
  embedding from aggregated triads) — new signal type for the append-only
  event log, aggregation stays a separate batch job per replatform
  principle 3.
- **The factor structure is a prior, not truth**: it is computed from LLM
  scores and may partly reflect classifier halo. Human duels test whether
  the fused dimensions actually separate.
- **Cross-project consumer**: Narada's mood engine (prana roadmap F8) uses
  this space as its native mood representation; cross-modal probes
  (weather/art/music vs movies) land in the same signal log.
