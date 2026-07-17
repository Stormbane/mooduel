# ADR 0001: Mooduel feeds Beautiful Tree

- **Status**: Accepted (direction), deferred (implementation is post-MVP)
- **Date**: 2026-07-17
- **Deciders**: Suti, Narada
- **Prior art**: "bt-calibrate" — BT calibration tooling, listed unscoped in
  the May 2026 project inventory. This ADR gives that idea its shape.

## Context

Every calibration signal Mooduel collects carries `session_id` and
`user_id`. The same stream aggregates two ways:

- **by movie** → MoodueDB calibration (the population's read on a film)
- **by user** → a personal taste vector (one person's read on the mood space)

The second aggregation is, structurally, what Beautiful Tree needs: taste
as identity, resonance between people computed from how they respond to
the same stimuli. Movie taste is likely BT's best first organ — low-stakes
to disclose, endlessly conversational, and Mooduel makes disclosure feel
like play instead of a questionnaire. The 2026-07-17 game session
confirmed the engagement law that makes this work: games with an
adversary and an ego payoff (Hotter, the card game) get played; neutral
puzzles don't. "Play games to train a recommender for yourself" is the
product loop that keeps the signal flowing.

## Decision

Mooduel becomes a feeder organ for Beautiful Tree. Post-MVP, in order:

1. **BT sign-in.** "Sign in with Beautiful Tree" alongside the existing
   Supabase auth. A linked BT identity attaches `user_id` to every signal
   the player emits, making the taste vector durable and portable.
2. **Taste-vector sync (Mooduel → BT).** A versioned, consented export of
   the per-user aggregation: dimensional preferences, recognition set
   (Seen It), play-derived confidence per dimension. BT consumes it as
   evidence for its resonance predictions. Contract is a published schema,
   not a shared database — Mooduel owns its raw signals; BT gets
   aggregates.
3. **BT as prediction service (BT → Mooduel).** Mooduel may call BT to
   predict for its own features: which movies this user likely knows
   (recognition prior for dealing), what they'd enjoy (recommendations),
   and eventually taste-twin matching inside Mooduel's social games.

## Consequences

- The signals schema stays the single source of truth; no BT-specific
  write paths into Mooduel. Integration lives at the aggregate boundary.
- Anonymous play remains first-class: session-scoped vectors live in
  localStorage and die with the session unless the player signs in. The
  sign-in pitch writes itself: "keep your movie brain."
- Consent is explicit and per-direction: syncing the vector to BT and
  letting BT predict inside Mooduel are separate toggles.
- Anything built pre-MVP (Seen It, taste profiles, per-user aggregation)
  should keep the per-user vector cleanly separable so step 2 is an
  export, not a refactor.

## Out of scope (for now)

Realtime identity federation, cross-media vectors (TV/games/books/music
per the M-series roadmap), and any BT-side schema — those get their own
ADRs when they're real.
