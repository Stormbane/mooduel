# Component Architecture — Modularisation Plan

## Problem
Every game and page has its own inline movie display with duplicated patterns:
- Title + year + rating
- Vibe sentence in italics
- Genre pills
- Pacing/ending labels
- Comfort bar
- VA indicator
- Expanded mood profile

Also duplicated: nav bar (in every page), page layout (BGPattern + nav + main).

## Solution: Shared Component Library

### 1. `<MovieCard>` — Unified Movie Display

Three variants:

**Minimal** — for compact contexts (dashboard tooltips, game pick lists)
```
┌──────────────────────────┐
│ [poster] Title (2019)    │
│          IMDb 8.5 🍅93%  │
└──────────────────────────┘
```

**Default** — for game results, search results, explore grid
```
┌───────────────────────────────────┐
│ [poster]  Title (2019) 120m  [VA]│
│           IMDb 8.5  🍅93%  🍿85% │
│                                   │
│ "Vibe sentence in italic..."      │
│                                   │
│ Drama  Crime    ◉solo ♡date       │
│ building · triumphant · man-hole  │
│ ████████████░░ comfort 0.7        │
│ ⚠ sudden-grief                    │
└───────────────────────────────────┘
```

**Expanded** — for explore detail, dialog
```
┌───────────────────────────────────┐
│ (everything from default)         │
│───────────────────────────────────│
│ MOOD TAGS                         │
│ redemption · hope · friendship    │
│                                   │
│ DOMINANT EMOTIONS                 │
│ trust · anticipation · sadness    │
│                                   │
│ MOOD PROFILE                      │
│ valence    ████████░░░ 0.75       │
│ arousal    ███░░░░░░░░ 0.30       │
│ dominance  █████████░░ 0.80       │
│ absorption █████████░░ 0.85       │
│ hedonic    █████░░░░░░ 0.55       │
│ eudaimonic ████████░░░ 0.88       │
│ psych rich ██████░░░░░ 0.65       │
│ comfort    ███████░░░░ 0.70       │
│ convo      ████████░░░ 0.82       │
└───────────────────────────────────┘
```

Props:
```typescript
interface MovieCardProps {
  movie: SlimMoodMovie;
  variant?: "minimal" | "default" | "expanded";
  expandable?: boolean;  // click to toggle default↔expanded
  onClick?: () => void;
  className?: string;
}
```

### 2. `<MovieDialog>` — Modal Wrapper

Renders an expanded MovieCard inside a dialog/modal overlay.
Uses `<dialog>` element or Radix Dialog for accessibility.

```typescript
interface MovieDialogProps {
  movie: SlimMoodMovie | null;
  open: boolean;
  onClose: () => void;
}
```

### 3. `<NavBar>` — Shared Navigation

Extracts the duplicated nav pattern from every page.

```typescript
interface NavBarProps {
  currentPage?: string;  // highlights the active link
  maxWidth?: string;     // "max-w-6xl" or "max-w-7xl"
}
```

Links: Play, Games, Explore, Dashboard, About
Logo links to /

### 4. `<PageLayout>` — Shared Page Wrapper

Wraps every page with BGPattern + NavBar + main container.

```typescript
interface PageLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  maxWidth?: string;
  patternColor?: string;  // default: "rgba(139,92,246,0.15)"
}
```

### 5. Shared Sub-Components (used by MovieCard internally)

- `<VAIndicator>` — the tiny 2D dot on a grid
- `<ComfortBar>` — colored progress bar
- `<DimBar>` — labeled dimension bar with value
- `<MovieRatings>` / `<MovieRatingsCompact>` — already extracted
- `<MoodPills>` — genre/tag/emotion pills

### Poster Strategy

TMDB poster images via `https://image.tmdb.org/t/p/w185/{poster_path}`.
Need to add `pp` (poster_path) field to slim data.

Without poster: show VA-derived color gradient as background
(high V high A = warm pink, low V low A = cool blue, etc.)

### File Structure

```
src/components/
  movie/
    movie-card.tsx       — the unified card
    movie-dialog.tsx     — modal wrapper
    va-indicator.tsx     — tiny VA dot
    comfort-bar.tsx      — comfort progress bar
    dim-bar.tsx          — dimension bar
    mood-pills.tsx       — tag/genre/emotion pills
  ui/
    ratings.tsx          — already exists
    bg-pattern.tsx       — already exists
  layout/
    nav-bar.tsx          — shared nav
    page-layout.tsx      — shared layout wrapper
```

### Migration Plan

1. Build the shared components
2. Refactor explore page to use them (proof of concept)
3. Refactor each game one at a time
4. Extract NavBar and PageLayout last (least risky)

### Performance Notes

- MovieCard uses CSS transitions, not framer-motion per card
- Expanded state uses max-height transition
- Framer-motion only for page-level animations
- Poster images lazy-loaded with Next.js Image component
- 30K movies paginated (60 per page in explore)
