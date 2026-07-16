# Game Build Brief — Phase 4

*The creative mandate. Written 2026-07-17 before the xhigh build session.
Foundations (SDK, signals, PvP skeleton) are done and reviewed — see
`calibration-replatform-plan.md`. This brief is what the build loop follows.*

## The mandate

Suti's words: max creativity for the games, high effort, build something
FUN. The engineering floor is fixed; everything about how the games feel
is open. Take real creative swings. A game that's technically correct but
feels generic is a failure; a game with personality that needs a bug fix
is a draft.

Voice: all player-facing copy uses clean public voice (see CLAUDE.md) and
must sound human. Run /humanizer instincts over every string.

## Deliverables

1. Five games, built in this order (each exercises the newest layer):
   1. **Hotter** — pairwise mood duel. Two posters, one question, tap,
      streak. Emits pairwise signals (SDK is live: /api/games/pair,
      emitSignal). Framing: "you vs the model" until consensus accrues.
   2. **Games hub v1** — select-game screen at `/games` (see Hub below);
      register Hotter, then each game as it lands.
   3. **Shape of Stories** — six drawn story curves, pick the shape for a
      movie you know. Categorical signals rebuild the arc dimension.
   4. **Mood Bridge** — daily puzzle: Movie A → Movie B in ≤5 hops, each
      hop within a mood-distance budget. Par, streaks, shareable path.
   5. **The Dinner Party** — four guests with described emotional states,
      curate the film that threads them. Zillmann MMT as a puzzle.
   6. **Mooduel: The Card Game** — THE FLAGSHIP, built last so the visual
      language and SDK are battle-tested. Draft 8 movies, trick-taking
      over mood categories. House bot + async PvP via challenge links.
      Rules are fully open — design them for fun first. The concurrency
      skeleton (create_match/join_match/submit_move/get_hand,
      match_secrets) is the floor; game logic goes in service-role routes
      that validate legality before calling submit_move.
2. **Hub final polish** — games.mooduel.com identity: middleware host
   rewrite (games.mooduel.com → /games), OG cards, each game's tile
   carries its costume.
3. **Harmonization pass** (post-build, deliberate): walk every game
   against the consistency checklist below; tune outliers, don't repaint.
4. **Verification**: production build green, a Playwright smoke test per
   game, /verify-style end-to-end pass of each game against the live dev
   server, perf sanity (instant loads — Suti closes slow tabs).

## Style consistency: stage vs costume

**The stage (fixed, shared — build nothing that violates it):**
- Game-shell contract: `<GamePage>` / `<IntroScreen>` / `<ResultScreen>`
  markup structure, shared nav, canonical result card + share flow
  (/api/share → /s/[token] → OG image)
- Typography: existing font stack and one type scale
- 4px border radius everywhere (Suti's rule: radius encodes seriousness)
- Dark stage base; games light their own scene on top of it
- Motion principles (emil-design-eng skill is installed — use it):
  fast (150–300ms), interruptible, ease-out entrances, transform/opacity
  only, no layout-thrashing animations
- Touch floor: ≥44px targets, no hover-only affordances, portrait-first,
  safe-area insets

**The costume (per-game, maximum freedom):**
- Signature accent hue + palette per game (hub tiles inherit it)
- Motion personality (Hotter snaps, Shape of Stories draws, the Card Game
  deals — verbs should differ)
- In-play layout, interaction metaphors, sound hooks (design for sound
  even if muted v1), copy voice within the shared register

**Harmonization checklist (the post-build pass):**
shell contract used · type scale respected · 4px radius · motion inside
the duration band · touch targets · share card renders · loading states ·
empty/error states · reduced-motion respected · costume hue used
consistently within the game and on its hub tile

## Mobile-appropriate floor (future iOS/Android via Capacitor)

- Play surfaces are client components; ALL data via /api routes; no
  server-component data dependencies inside the play path
- API base URL readable from env (NEXT_PUBLIC_API_BASE, default same-origin)
  so a native shell can point at production
- `src/lib/games/client/storage.ts`: thin abstraction over localStorage
  (get/set/remove, JSON-typed) — swappable for Capacitor Preferences
- No window-width assumptions; test at 375px first, desktop is the
  enhancement
- 60fps or it doesn't ship (Suti's performance baseline is non-negotiable)

## Technical floor (already built — use, don't rebuild)

- Sessions: `ensureSession()` once on game mount; signed httpOnly cookie
- Pairwise deals: GET /api/games/pair?dimension=&game=&v=
- Signals: `emitSignal(assignmentId, choice)` — fire-and-forget, idempotent
- PvP: RPCs via service-role routes only; hands live in match_secrets and
  reach the client only through get_hand for the caller's own seat
- Movies data: /api/movies/pool and friends; 30,611 rows in Supabase
- Old game experiments stay route-live but hidden from nav

## Hub (games.mooduel.com)

- `/games` is the select screen: each game a tile in its costume hue,
  with a one-line hook in clean public voice, play count later
- `middleware.ts`: host === games.mooduel.com → rewrite to /games tree
  (DNS + Vercel domain config is Suti's step; code path ships ready)
- The hub is a product surface, not a directory listing — it should make
  someone want to try all five

## Definition of done, per game

- [ ] Playable end-to-end against real data, mobile-first
- [ ] Signals wired where the game teaches the dataset
- [ ] Result screen + share card + OG image
- [ ] Registered on the hub with its costume
- [ ] Playwright smoke test
- [ ] Copy passes the human-voice bar
- [ ] Production build green

## Session protocol

Fresh context, effort xhigh. Kick off with:
`/loop Build the Phase 4 game slate per .ai/knowledge/game-build-brief.md — self-paced. One deliverable per iteration, commit as you go, stop after the harmonization pass + verification.`
Commit per game; push at milestones. The card game may take multiple
iterations — that's expected, it's the flagship.
