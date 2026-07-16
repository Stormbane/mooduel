# Calibration Replatform Plan

*Drafted 2026-07-17. Revised same day after Codex adversarial review round 1
(all 8 findings accepted; see Review log at bottom). Goal: re-engineer
Mooduel's data + game foundations so that games act as calibration engines
for the mood dataset, then build the new game slate on top. HuggingFace
remains the open publishing channel; Supabase remains the canonical store.*

## The core idea

The v1.0 dataset has known weaknesses: arousal and conversation-potential
inflation, emotional-arc mode collapse (64.5% man-in-a-hole), enum leakage
(~1,200 rows), and 0.05-grid quantization. Every one of these is fixable
with human judgment, and the games are how we collect it at scale. Every
play is a label:

- Pairwise picks ("which is scarier?") -> paired-comparison model that
  recalibrates the continuous dimensions.
- Arc-shape picks -> crowdsourced relabeling of emotional_arc.
- Written vibes -> human vibe corpus.

The existing corrections/votes/reputation tables stay as the explicit
"expert path". Game signals become the implicit mass path. Both flow into
versioned dataset releases on HuggingFace.

## Architecture principles

1. **The LLM scores are an immutable prior.** Snapshot them once; never
   overwrite. Calibration produces new versions alongside, with provenance.
2. **Supabase is canonical; HF releases are build artifacts.** Every export
   derives from a named, completed snapshot — never from the live table.
   No JSON files as sources of truth anywhere.
3. **Signals are append-only events with full context.** Aggregation is a
   separate, re-runnable batch job. If the methodology improves later, we
   re-aggregate from the raw log — nothing is lost, and every event carries
   enough context (assignment, order, versions) to be reinterpreted.
4. **The database is the trust boundary.** Clients never get raw insert
   rights on calibration or match state; everything mutating goes through
   server-validated paths. Anonymous play still teaches us, but only
   through served, signed assignments.
5. **Calibrated values must earn promotion.** No calibrated score reaches
   the serving columns or an HF release until it passes offline validation
   against held-out human judgment.

---

## Phase 0 — Release blockers ✅ (done 2026-07-17)

From the 2026-07-17 audit:

- [x] Fix `/explore` `useSearchParams()` Suspense boundary (build passes)
- [x] Add LICENSE (MIT) — dataset note included
- [x] Add `avatars.githubusercontent.com` + `lh3.googleusercontent.com` to
      `next.config.ts` remotePatterns
- [x] Fix `.env.example`: `TMDB_READ_ACCESS_TOKEN` + missing keys, sectioned
- [x] Reconcile root README schema table (snake_case, 6 arcs / 5 pacing /
      7 endings, reasoning footnote, v1.0 enum-leak disclosure, Haiku 4.5)
- [x] Gitignore + untrack `dataset/*.jsonl` + `dataset/*.csv`
- [x] FUNDING.yml: removed empty buy_me_a_coffee line (re-add when the
      account exists — Suti)

Note: `dataset/README.md` (the HF card copy) still lists `steady` as a valid
arc — deliberately untouched until Phase 1d regenerates the card from the
v1.0.1 snapshot, to avoid drift with the live HF card.

## Phase 1 — Data foundation: provenance + reproducibility

**1a. Enum normalization with a patch ledger.** Repairs are recorded before
they are applied, and the published source JSONL is never mutated in place.

- New table `score_patches` (and mirrored JSONL artifact in `data/patches/`):
  `(movie_id, field, old_value, new_value, method, run_id, model,
  prompt_version, input_hash, raw_response_ref, created_at)`.
  `method` ∈ `mechanical-map` | `llm-reclassify`.
- Mechanical maps: `ending_type` tragic->devastating, cliffhanger->ambiguous;
  out-of-vocab warnings/emotions -> nearest enum or drop.
- LLM re-classification (Haiku batch, ~1.2K rows): arc values that are
  pacing words (steady/episodic/building/relentless), `ending_type`
  oedipus, `pacing` uneven. Store prompt/schema/model id and raw responses
  under `data/patches/raw/`.
- Apply the validated patch set transactionally to Supabase; derive a new
  normalized JSONL artifact (`data/movie-mood-scores-v1.0.1.jsonl`) rather
  than editing `movie-mood-scores.jsonl`.

**1b. Immutable baseline.** New table `movie_scores_baseline` — exact copy
of the 18 dims post-normalization, tagged `source = 'llm-haiku45-v2'`.
Never updated. This is what MoodBench-style analysis diffs against later.

**1c. Reproducible seed path.** Rewrite `scripts/seed-movies.ts` to read the
canonical JSONL + patch ledger directly, so JSONL -> Supabase is one
command. Remove `09-fetch-posters.mjs`'s dependency on the deleted
`public/mood-data.json`.

**1d. Snapshot-based versioned export.** Extend `scripts/export-dataset.ts`:
- Exports take a **snapshot id** (normalization run or calibration run),
  never the live table. `--version` must not clobber: fail if the version
  already exists locally or on HF.
- Each release emits a manifest: schema hash, row count, content hashes,
  source git commit, snapshot/run id, model provenance, license.
- Card + artifacts upload together as one HF commit, tagged, after local
  verification. Card schema section is generated from the same snapshot.
- Release **v1.0.1** after 1a-1c land: enum-fixed, honest limitations
  section (quantization, arc caveat, sparse-input films).

## Phase 2 — Calibration engine

**2a. Trust boundary.** No public inserts on any calibration table.
- `calibration_signals` RLS: no public insert, no public read. Writes go
  through a security-definer RPC (or service-role API route) that derives
  `user_id` from `auth.uid()`, stamps server time, validates kind-specific
  invariants (also enforced as CHECK constraints), and enforces per-session
  and per-IP rate caps *at the database boundary*, not just the route.
- Anonymous sessions get a **signed session token** minted server-side
  (HMAC, short TTL, rotating); signals referencing unsigned or expired
  sessions are rejected.
- **Issuance is rate-limited too, not just submission.** Token minting and
  assignment dealing have per-IP caps — otherwise a bot Sybils past
  per-session caps by minting fresh sessions per vote. Because the
  database cannot learn a trustworthy client IP from a direct anonymous
  RPC call, all anonymous mutations route through Next API routes (the
  server supplies an IP hash to the cap check); the RPC path trusts only
  service-role callers.
- Aggregate outputs are public; the raw stream is not.

**2b. Served assignments + idempotent events.** Clients can only vote on
comparisons the server dealt, and can only submit *answers*, never context:
- `assignments` table: server issues `(assignment_id, game, kind, dimension,
  movie_a, movie_b, displayed_order, prompt_version, session_id, dealt_at)`
  when the pool service serves a round. Unsolicited comparisons are
  rejected — fabricated votes on self-chosen pairs never enter the pool.
- **The submission RPC accepts exactly three things:** `assignment_id`,
  `client_event_id`, and the kind-specific `choice`. Every contextual
  column on the signal row (game, kind, dimension, movies, session,
  versions, order) is copied server-side from the locked assignment —
  clients cannot alter any of it. The RPC locks and consumes the
  assignment transactionally (one accepted signal per assignment, unique
  constraint), validates the choice against the assignment's kind (e.g.
  'a'/'b' for pairwise), and rejects mismatched sessions.
- **Latency is server-computed** (`received_at - dealt_at`), never
  client-supplied — the <400ms abuse filter can't be defeated by forging
  `latency_ms`.
- `client_event_id` (unique) makes batched retries idempotent; the batch
  endpoint returns per-event acceptance.
- Events record `game_version` / `prompt_version` / `displayed_order` so
  future re-aggregation can correct side and context effects.

```sql
create table calibration_signals (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references assignments(id) unique,
  client_event_id uuid not null unique,
  session_id     text not null,           -- copied from assignment
  user_id        uuid references profiles(id),  -- derived from auth.uid()
  game           text not null,           -- copied from assignment
  game_version   text not null,           -- copied from assignment
  kind           text not null check (kind in ('pairwise','categorical','scalar')),
  dimension      text not null,           -- copied from assignment
  movie_a        integer not null references movies(tmdb_id),  -- copied
  movie_b        integer references movies(tmdb_id),           -- copied
  choice         text not null,           -- the ONLY client-authored value
  latency_ms     integer,                 -- received_at - assignment.dealt_at
  received_at    timestamptz not null default now()   -- server clock only
);
```

**2c. Comparison policy + calibration methodology.**
- **Sampling policy:** pairs are dealt by a randomized policy that
  preserves comparison-graph connectivity — a mix of near-neighbor pairs
  (informative) and long-range random pairs (connectivity anchors),
  stratified across popularity so the graph never fragments into
  popular/obscure islands. Policy version is recorded on the assignment.
- **Model:** regularized Bayesian Bradley-Terry per dimension (Gaussian
  prior keeps sparse graphs identifiable), with per-movie posterior
  uncertainty. Graph diagnostics (component count, coverage) run every
  aggregation.
- **Blending:** shrinkage weight comes from posterior precision, not raw
  vote count: `calibrated = w * human + (1-w) * llm_prior`,
  `w = precision_gain / (precision_gain + k)`.
- **Scale mapping:** BT strengths are relative; the absolute scale is
  learned from an **anchor set** (~300 movies with trusted human absolute
  ratings — seeded from Suti + accepted corrections) via isotonic
  regression, NOT full-range rank-normalization (which would force a
  uniform marginal and manufacture artificial extremes).
- **Categorical dims** (emotional_arc, ending_type): reputation-weighted
  majority with minimum-n (>= 5) and margin requirements.
- **Corrections** (existing table): accepted corrections apply as strong
  scalar signals into the same merge path.
- **Abuse filters at aggregation time:** drop latency < 400ms, per-session
  daily caps, per-session agreement-rate outlier detection.

**2d. Atomic run promotion.** The weekly GitHub Action job:
1. Takes an advisory lock (concurrent runs abort cleanly).
2. Writes results to immutable run tables: `calibration_runs(run_id,
   status, policy_version, diagnostics jsonb, started_at, finished_at)` +
   `movie_scores_calibrated(run_id, movie_id, <18 dims>, n_votes,
   posterior_var, PRIMARY KEY (run_id, movie_id))` — the composite PK
   makes duplicates impossible and reruns idempotent by constraint.
3. Validates **exact snapshot completeness**, not just row counts:
   anti-joins in both directions prove the run's movie set equals the
   canonical `movies` set (no missing, no extra), plus distribution
   sanity, graph diagnostics, and held-out anchor error vs. previous run.
4. Only a validated, completed run may be **promoted**: a single
   transaction updates the `movies` serving columns from that run, asserts
   the updated row count equals the expected movie count (abort on
   mismatch), and stamps `calibration_version`. Failed or partial runs
   never touch serving data. Completed run rows are immutable.
5. Exports (Phase 1d) reference a promoted run_id, so a concurrent export
   can never mix calibration versions.

## Phase 3 — Game platform SDK ✅ (foundations done 2026-07-17;
## see status note at the top of the Review log for what remains gated)

Consolidate into `src/lib/games/` (the existing `game-shell` components
stay the visual chrome):

- **Pool service.** Server-side seeded sampling: `getPair(dimension, seed)`
  (creates the assignment, 2b), `getDaily(gameId, date)`,
  `getByFilter(...)` — deterministic daily seeds, popularity-floor options,
  exclusion of already-seen ids per session.
- **Signal emitter.** `emitSignal()` — batches to the signals RPC with
  client_event_ids, retries safely (idempotent), zero UI latency.
- **Session + streaks.** Signed anon session tokens (2a) + localStorage
  state; Supabase for authed; streak/daily-completion helpers shared by
  all daily games.
- **Share integration.** Every game result renders through the canonical
  `<ResultScreen>` + `/api/share` + `/s/[token]` OG-image path.

**PvP foundation — server-authoritative state machine.** Written as a spec
before implementation (Codex round-1 finding accepted in full):

- **Hidden state is never client-readable.** Hands and deck live in
  `match_secrets` (RLS: no select for anyone). Players see only their own
  hand via a security-definer RPC / player-scoped projection.
- **All actions are transactional RPCs**: `join_match`, `play_card`,
  `resolve_round`, `forfeit`. Each validates participant, turn, legal card
  (against server-held hand), expected `state_version` (optimistic
  concurrency), and an idempotency key. Double-submits and replays are
  no-ops; two clients claiming one seat lose to a unique constraint.
- **Schema:**

```sql
matches(id, code text unique, game text,
        status text check (status in ('open','active','finished','expired','forfeit')),
        state_version integer not null default 0,
        current_turn smallint, config jsonb, created_by,
        turn_deadline timestamptz, created_at)
match_players(match_id, seat smallint, user_id, session_id, score int,
              unique(match_id, seat),
              check (num_nonnulls(user_id, session_id) = 1))
-- one identity cannot hold two seats in a match (partial unique indexes,
-- so multiple anon players with NULL user_id don't collide):
--   create unique index on match_players(match_id, user_id)
--     where user_id is not null;
--   create unique index on match_players(match_id, session_id)
--     where session_id is not null;
match_secrets(match_id, seat smallint, hand jsonb, deck jsonb,
              unique(match_id, seat))          -- RLS: no client access
match_rounds(match_id, round_no smallint, category text, plays jsonb,
             winner_seat, resolved_at, unique(match_id, round_no))
```

- **Lifecycle:** turn deadlines with auto-forfeit/expiry (async matches
  can't zombie); house bot plays through the same RPC contract as humans;
  invite links are **single-claim capabilities consumed atomically inside
  `join_match`**, which also rejects any identity already seated in the
  match — no self-play by consuming your own invite.
- Supabase Realtime broadcasts public match state only (never secrets).

## Phase 4 — Build the games (Fable, max effort)

Order chosen so each game exercises the newest layer of foundation, with a
validation gate before calibration goes live:

1. **Hotter** — pairwise mood duel ("which is scarier?"). Smallest surface,
   proves assignments + signals end-to-end. Framing is "you vs the model"
   from day one, so it needs no calibrated data to be fun.
2. **GATE: calibration shadow run.** Hotter collects signals for 2-4 weeks
   with aggregation running in shadow (runs written, nothing promoted).
   Pass criteria: replay/idempotency tests, abuse-injection tests, BT graph
   connectivity and uncertainty diagnostics, blinded anchor-set comparison
   showing calibrated values beat the LLM prior. Only then: freeze the
   event schema v1, promote the first run, unblock v1.1 planning.
   Game-building continues in parallel — the gate blocks *promotion and
   schema freeze*, not development.
3. **Mooduel: The Card Game** — the flagship, finally earning the name.
   Draft 8 movies, trick-taking over mood categories, vs house + async PvP
   via challenge links. Built on the Phase 3 state machine spec.
4. **Shape of Stories** — six arc curves, pick the shape for a movie you've
   seen. Feeds categorical signals; rebuilds the arc dimension.
5. **Mood Bridge** — daily A->B pathfinding puzzle with hop budget and par.
6. **The Dinner Party** — persona-matching puzzle; teaches Zillmann MMT.

Each ships with: shared shell, share card + OG image, signal emission,
daily seed where applicable. Old experiments stay route-live but hidden
from nav (per the 2026-04-25 decision).

## Phase 5 — Dataset v1.1: the human-calibrated release

After the gate passes and signal volume justifies it (target: 50K+
pairwise votes, 10K+ arc votes):
- Freeze a promoted calibration run as `v1.1`, export via the snapshot
  path, publish to HF with a methodology section: "calibrated by gameplay"
  — randomized paired comparisons + Bayesian BT + anchored scale mapping +
  crowd relabeling.
- Write the announcement piece / data-journalism posts from the deltas
  ("the movies the AI got most wrong about").
- This is also the moment MoodBench (LLM affect eval) becomes possible.

## Decisions (Suti, 2026-07-17)

1. Calibrated values **overwrite the serving columns** via atomic run
   promotion; the immutable baseline table preserves the LLM prior.
2. Aggregation runs as a **repo script on GitHub Action cron** —
   transparent, versioned, free.
3. **Anonymous signals accepted**, via signed session tokens with caps and
   latency filtering; authenticated signals weighted higher via reputation.
4. Card game v1 ships **house bot + async PvP via challenge links**;
   live Realtime mode is a fast-follow.

## Status (2026-07-17, end of foundations loop)

Done: Phase 0 ✅ · Phase 1a ledger + 1b tables + 1c seed + 1d export ✅ ·
Phase 2 trust boundary, signals, run tables, aggregation engine, atomic
promotion, weekly Action ✅ · Phase 3 SDK (session tokens, pool/assignment
service, signal routes, client emitter) + PvP concurrency skeleton ✅.
All DB objects smoke-tested against the live project.

Blocked on Suti:
- Fresh ANTHROPIC_API_KEY in .env.local (current returns 401) → then:
  `node scripts/mood-classifier/reclassify-enums.mjs submit|fetch
  normalize-2026-07-16-e4c44a` → `node scripts/data-pipeline/11-apply-patches.mjs
  --run normalize-2026-07-16-e4c44a` → baseline snapshots automatically →
  `npx tsx scripts/export-dataset.ts --version 1.0.1` → upload to HF.
- GitHub repo secrets for the calibration Action (NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY).
- SESSION_TOKEN_SECRET in production env when deploying.

Deliberately left for the Phase 4 creative build: game rules inside the
PvP skeleton (hand dealing, trick resolution, scoring), the Hotter UI and
every other game, pair-policy v2 (informativeness-weighted sampling), the
anchor set, and shared streak/daily helpers (build them alongside the
first daily game that needs them).

## Review log

**Round 1 — Codex adversarial review, 2026-07-17.** Verdict:
needs-attention ("no-ship" on the original draft). Dispositions:

| # | Finding | Severity | Disposition |
|---|---------|----------|-------------|
| 1 | Public insert RLS bypasses API-route rate limiting; user_id/latency forgeable | critical | **Accepted** → 2a trust boundary: no public inserts, security-definer RPC, signed sessions, DB-level caps |
| 2 | No idempotency/assignment context; retries duplicate; fabricated comparisons indistinguishable | high | **Accepted** → 2b served assignments, client_event_id uniqueness, order/version recording |
| 3 | BT + rank-normalization not defensible: connectivity, opponent strength, uniform-marginal distortion | high | **Accepted** → 2c: randomized connectivity-preserving sampling, Bayesian BT with uncertainty, precision-based shrinkage, anchor-set isotonic scale mapping |
| 4 | In-place overwrite can leave mixed calibration versions; no lock/rollback | high | **Accepted** → 2d immutable run tables + validation + atomic promotion + advisory lock |
| 5 | PvP: hands readable in jsonb, no turn/seat constraints, races, no abandonment | high | **Accepted** → Phase 3 server-authoritative state machine, match_secrets, transactional RPCs, deadlines |
| 6 | Enum repair destructive, not reproducible | high | **Accepted** → 1a patch ledger with method/model/raw-response provenance; source JSONL never mutated |
| 7 | Versioned filenames ≠ immutable HF releases | medium | **Accepted** → 1d snapshot-bound exports, no-clobber, manifests, atomic HF commit |
| 8 | No validation gate before five games depend on the event contract | medium | **Accepted with adjustment** → Phase 4 gate after Hotter blocks *promotion + schema freeze*; game development itself proceeds in parallel (the games are fun without calibrated data, and serialization would cost months) |

**Round 2 — Codex recheck of the revision, 2026-07-17.** Verdict:
needs-attention (four residual contract gaps; round-1 architecture
accepted as closing raw-table access). Dispositions — all accepted and
folded in; per protocol this closes plan debate:

| # | Finding | Severity | Disposition |
|---|---------|----------|-------------|
| 9 | Assignment doesn't bind the event payload — client could submit valid assignment_id with altered dimension/movies/latency | high | **Accepted** → 2b: RPC accepts only (assignment_id, client_event_id, choice); all context copied server-side from the locked assignment; latency = received_at − dealt_at |
| 10 | Run promotion could still mix versions: no (run_id, movie_id) uniqueness or exact set-equality check | high | **Accepted** → 2d: composite PK, bidirectional anti-join completeness proof, assert updated-row count on promote |
| 11 | Signed anon sessions cheaply Sybilable via fresh-token minting; DB can't trust client-reported IP on direct RPC | medium | **Accepted** → 2a: rate-limit token + assignment issuance per IP; anonymous mutations route through Next API routes supplying an IP hash; RPC trusts service-role callers only |
| 12 | One identity can occupy both PvP seats (consume own invite, control both hands, farm signals) | medium | **Accepted** → Phase 3: check exactly-one identity type per row, partial unique indexes on (match_id, user_id) and (match_id, session_id), join_match consumes single-use invites atomically and rejects already-seated identities |
