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
