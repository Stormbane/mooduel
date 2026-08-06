# NEVER SEEN IT — Full Game Specification

*A bluffing card game about movies nobody at the table has watched,
including the AI pretending to be your friend.*

Version 1.3 — 2026-08-06. Revised through two Codex adversarial review
rounds (12 findings total, all accepted; dispositions in §16), then
extended with the app shell addendum (§17): title screen, local
profiles, persistent score history, and stubbed online surfaces. This document is self-contained.
The building agent needs no access to the Mooduel codebase; every data
shape, rule, and interface it needs is defined here.

---

## 1. One-paragraph pitch

Never Seen It deals each player a hand of genuinely obscure movies
(poster, title, year — no synopsis). Each round, a mood request drops
("something that feels like a warm bath but ends like a cold shower")
and every player pitches one of their movies as the perfect fit, in one
typed sentence, with total confidence, having never seen it. The round's
Customer picks the pitch that sold them. Then the database reveals the
movie's real mood profile and a smug pixel Critic delivers the verdict:
either you genuinely read the poster right (you played it Straight) or
you sold a complete lie on purpose (you declared Balderdash and it
landed). Both lanes score, both carry risk. One seat at the table may
secretly be an AI, and because everyone is fabricating confidently about
films they haven't seen, "sounds made up" is no tell — you have to catch
it on taste. The night ends with the table's aggregate mood picking a
movie for the group.

## 2. Design pillars

1. **Obscurity is the level playing field.** The game only works because
   nobody knows these movies. Never deal famous films (see popularity
   rules, §7.2).
2. **Two lanes, both risky.** Genuine poster-reading instinct and
   shameless salesmanship both score, and each is a declared bet that
   can miss. Players choose a lane each round; the table learns each
   player's style.
3. **The reveal is the dopamine.** Synopsis + data verdict + Critic
   trash talk is the payoff of every round. Never rush it, never skip it.
4. **Every laugh is a signal.** Votes, picks, and "Overrule the Critic"
   taps are calibration data for the movie mood dataset — but only when
   the tap's meaning is honest (see §8; scoring incentives must never
   contaminate a calibration signal). The player thinks they are dunking
   on a smug robot; they are labeling data.
5. **Lofi with intent.** GBA palette discipline, PS1 jank charm. The
   aesthetic is a costume, not an excuse — 60fps, instant loads,
   readable text, no exceptions.

## 3. Table shape and modes

- The table always seats **4**. Humans fill 1–4 seats; the rest are
  filled by open bots (§6.1) — except in Replicant mode, which has its
  own seat rules (§6.2).
- **v1 play modes:**
  - **Solo** — 1 human + 3 open bots (primary dev target).
  - **Hotseat** — 2–4 humans pass one device; open bots fill to 4.
  - **Replicant mode** — exactly **2 humans** + 2 hidden seats (§6.2).
    3-human Replicant is out of scope for v1 (see §16, finding 3).
- Real-time online multiplayer is **out of scope for v1** but the state
  machine must be serializable (plain JSON game state, reducer-style
  transitions) so a server can drive it later.

## 4. Match structure

- A match = **each player is Customer twice** → 8 rounds at 4 seats,
  then **The Screening** finale (§4.7).
- Hand size: **5 movie cards**, drawn from the session pool, refill to 5
  after each round. Cards show: pixel-processed poster, title, year,
  country flag, runtime. **Never the synopsis, never mood data.**
- Hidden information: every seat's hand is private. The reducer's state
  is a single source of truth; all rendering goes through a per-seat
  **`viewFor(state, seat)`** projection that strips other seats' hands,
  pending pitches, lane declarations, and (in Replicant mode) seat
  provenance. Nothing outside `viewFor` may reach the screen — this is
  what keeps hotseat honest and makes online trivial later.

### 4.1 Round flow

```
1. THE MOOD     Contract card revealed to all (§5)
2. THE PITCH    Each non-Customer player secretly: picks 1 card from
                hand, declares a lane (Straight or Balderdash, §4.4),
                optionally flips Seen It (§4.5), types a pitch
                (max 140 chars)
3. THE VOTE     Customer picks the winning pitch (public). Non-customer
                pitchers simultaneously cast a side vote for the pitch
                (not their own) they believe best fits the data (§4.6)
4. THE REVEAL   Synopsis appears, data verdict computed, lanes revealed,
                Critic delivers the ruling, points fly
5. OVERRULE     Optional calibration taps (§8). 8s window, then next
                round.
```

The Customer sits out pitching that round (3 pitches per round). Rotate
Customer clockwise each round.

### 4.2 Timers, pacing, and the hotseat pass sequence

All timer values live in one config object, not hardcoded.

**Per-phase timers (per acting player, not shared):**

| Phase | Timer | Timeout behavior |
|---|---|---|
| Pitch (pick + lane + type) | 45s per pitcher | Auto-submit: random card, Straight lane, template pitch; Critic mocks |
| Customer pick | 20s | Random pick among pitches; Critic mocks |
| Side vote | 15s per voter (simultaneous where possible) | Abstain: no point gained or lost |
| Overrule window | 8s shared | Window closes |

**Pacing budgets (targets, not hard limits):**

- **Solo**: one human pitcher (or one human Customer) per round; bots
  act instantly with a short theatrical delay. Target **90–120s per
  round**, ~15–20 min per match.
- **Hotseat**: pitching is sequential pass-the-device, so the budget is
  **~60s of shared phases + up to 45s per human pitcher** per round.
  4 humans ≈ 3–4 min per round, ~30 min per match. This is accepted; do
  not try to force hotseat into the solo budget. Surface the pacing
  honestly in the mode-select copy ("a longer night with more lying").
- Timers are pause-able in hotseat.

**Hotseat pass sequence (normal mode), per round:**

1. Device shows THE MOOD to all (table view).
2. For each human pitcher in seat order: PASS_DEVICE screen (shows only
   "Pass to {name}") → private pitch screen (45s timer starts on tap,
   not on pass) → confirm → PASS_DEVICE to next. Bot pitchers resolve
   silently during the first pass.
3. Device to Customer: pick screen (pitches shown anonymized by seat
   letter until reveal). Customer pick is public — announce out loud;
   no privacy screen needed after the pick.
4. Side votes: if 2 humans are voting, sequential quick private taps
   (15s each) via PASS_DEVICE; if only 1 human votes, no pass needed.
   Bot votes resolve instantly.
5. Table view: THE REVEAL + OVERRULE for everyone together.

Replicant-mode pass sequence differs (§6.2): hidden seats never receive
the device and never require a pass, by design — this is not a leak in
the redesigned mode because *no* hidden seat is claimed to be present.

### 4.3 Fit score — the data verdict

Every contract targets **two clauses** (§5). For each pitched movie:

- **Numeric clause** (field, target value `t` in the field's range):
  `clauseScore = 1 - |v - t| / range` where `range` is 2.0 for
  [−1, 1] fields, 1.0 for [0, 1] fields.
- **Enum clause** (field, target value): 1.0 exact match, 0.5 if in the
  clause's declared `nearSet`, else 0.
- `fit01 = mean(clauseScores)` — a float in [0, 1].
- `fitPct = round(fit01 * 100)` — an integer in [0, 100]. **`fitPct` is
  the single canonical value**: it is what is displayed, compared
  against thresholds, and persisted in calibration signals. `fit01` is
  an intermediate only; never store or compare it.

Verdict bands (on `fitPct`):
- `fitPct ≥ 72` → **TRUE FIT** (stamp: green)
- `fitPct ≤ 40` → **MISFIT** (stamp: red)
- otherwise → **STRETCH** (stamp: yellow)

**Input validation:** at pool load, reject any movie record with a
missing, non-finite, or out-of-range value in any mood field a contract
can target (log the tmdb_id, drop the record). The reducer may assume
clean inputs; the loader owns validation.

### 4.4 Lanes — the Straight/Balderdash declaration

When submitting a pitch, the pitcher secretly declares a lane:

- **Straight** — "I genuinely think this movie fits."
- **Balderdash** — "I know this is a terrible fit and I'm selling it
  anyway."

Lanes are hidden until the reveal, then shown with the verdict. Scoring
(§4.6) pays a lane only when the data agrees with the declaration:
Straight pays on TRUE FIT, Balderdash pays on MISFIT. A Balderdash
declaration on a movie that turns out to genuinely fit earns base points
only — you thought you were lying and were accidentally right, and the
Critic will never let you forget it. This is the risk that keeps either
lane from being dominant (§16, finding 1): you cannot see fit scores, so
declaring Balderdash is a real bet on your own bad taste.

### 4.5 The Seen It token

Each player holds **one** Seen It token per match. If you have actually
seen the movie you are pitching, flip the token when submitting: your
pitch renders with a gold border, and if it wins, your lane points for
the round double. Honor system in v1 (couch social pressure is the
enforcement). Design the pitch-submit UI so flipping it feels like
drawing a knife: deliberate, two-step, slightly ceremonial.

The token claims only "I have watched this movie." It does **not** claim
the movie fits the contract, and no fit label is ever inferred from the
play itself (§16, finding 2). The calibration value of Seen It comes
from a separate, non-scoring question at reveal time (§8).

Stretch goal (v2, do not build now): "Prove It" challenge where the
Critic quizzes the claimant with 3 synopsis-derived questions.

### 4.6 Scoring

**Round scoring formula (the reducer implements exactly this):**

```
winBase        = 2  if your pitch wins the Customer's pick, else 0
laneBonus      = 2  if winBase > 0 AND lane matches verdict
                    (Straight & TRUE FIT, or Balderdash & MISFIT), else 0
seenMultiplier = 2  if you flipped Seen It this round AND winBase > 0, else 1

pitcherPoints  = (winBase + laneBonus) * seenMultiplier
customerBonus  = 2  to the Customer, only when the winning pitch was
                    Straight & TRUE FIT. Never multiplied by Seen It.
sideVotePoint  = 1  per §"Side votes" below
```

Worked totals for a winning pitch: Straight/TRUE FIT = 4 (8 with Seen
It), Full Balderdash = 4 (8 with Seen It), STRETCH or lane-mismatch = 2
(4 with Seen It). A losing pitch scores 0 regardless of lane or token
(the token is not consumed on a losing pitch).

| Other event | Points |
|---|---|
| Side vote: you voted for the highest-`fitPct` pitch **among the pitches you could legally vote for** | +1 |
| The Screening: your pitch wins the finale | +3 |
| Replicant mode: correct accusation of the Machine | +3 |
| Replicant mode: the Machine, per human whose accusation was wrong | +2 |

Notes:

- Straight and Balderdash bonuses are deliberately equal (+2). The
  lanes differ in texture, not expected value; the declaration risk
  (§4.4) is the balancing mechanism. Playtest question 2 (§15) revisits
  the numbers.
- **Side votes**: each voter's target set is the pitches they may vote
  for (all pitches except their own; the Customer casts no side vote).
  The voter scores +1 if their vote's `fitPct` equals the maximum
  `fitPct` within their own target set — ties all count. Timeout or
  abstain: no point, no penalty. This makes the point always achievable
  and the reducer rule total (§16, finding 9).
- STRETCH verdicts pay base win points only, regardless of lane.
- Final-score ties: shared win; the Critic mocks everyone equally.

### 4.7 The Screening (finale)

Across the match, track the **table mood vector**: the running mean of
the mood vectors of every movie the Customers picked (winning pitches),
weighted 2× when the winning lane bonus paid out.

**Distance metric (used here and in §9):** map every numeric dimension
onto [0, 1] (signed dims via `(v + 1) / 2`), then use unweighted
Euclidean distance over the nine numeric dimensions. Enum dimensions are
excluded from distance. Deterministic tie-break: lower tmdb_id wins.
Zero-history fallback (e.g. a match with no scored picks): use the
vector `[0.5, …]` with `comfort_level = 0.8`. Cosine distance is
explicitly wrong here — do not use it (§16, finding 7).

Finale flow: the game selects 4 candidate movies from the **screening
pool** (§7.2) nearest the table mood vector. Each player is dealt one
candidate at random and pitches it (same 140 chars, no lanes — the
finale is played Straight). Everyone votes (not for their own). Winner
gets +3 and the winning movie is presented full-screen as **"Tonight's
Screening"** with its synopsis and vibe sentence.

**v1 honesty rule:** with the mock dataset, every movie is invented, so
v1 frames the finale as the game's climax, not as a real
recommendation: the screen says "Tonight's Screening (from the Never
Seen It archive)" and omits any watch-this-tonight or where-to-watch
copy. The where-to-watch panel is production-integration scope and
appears only when a real `MovieSource` is wired (§16, finding 8).

## 5. Mood contracts

A contract is a human-sounding craving generated from two clauses over
the schema (§7.1). Never show raw dimension names to players; show the
sentence. Store the clauses for scoring.

### 5.1 Generation recipe

- Draw clause A from the **numeric** pool: valence, arousal, dominance,
  absorption, hedonic, eudaimonic, psych_rich, comfort_level,
  conversation_potential. Target value drawn from {low: 0.15, high:
  0.85} mapped into the field's range (for [−1,1] fields: −0.7 / +0.7).
- Draw clause B from either the numeric pool (different field) or the
  **enum** pool: pacing, ending_type, emotional_arc. Enum clauses
  declare a `nearSet` (e.g. target `bittersweet`, nearSet
  {`ambiguous`, `devastating`}).
- Render through a template bank keyed by (field, direction). Ship at
  least 6 templates per (field, direction) so contracts repeat rarely.
  Combine as: `"{clauseA_phrase}, {connector} {clauseB_phrase}."`
  Connectors: "but", "and somehow", "then", "with".

### 5.2 Sample contracts (ship these exact twelve as seed content)

Player-facing copy. Note the register: cravings a person would say out
loud, no jargon, no em dashes.

1. "Something that feels like a warm bath but ends like a cold shower."
   (comfort_level high + ending_type: unsettling, near {ambiguous})
2. "I want to be stressed out, but cozily." (arousal high +
   comfort_level high)
3. "Make me cry, and make it earn it." (valence low + eudaimonic high)
4. "Fun. Zero homework. Pure fun." (hedonic high + psych_rich low)
5. "Slow. Glacial. I want to marinate." (pacing: slow-burn, near
   {building} + absorption high)
6. "Something to argue about at dinner for a week." (
   conversation_potential high + ending_type: ambiguous, near {twist})
7. "I want to feel tiny and powerless, in a good way." (dominance low +
   absorption high)
8. "A movie that starts terribly for everyone and stays that way."
   (emotional_arc: riches-to-rags, near {oedipus} + valence low)
9. "Loud, fast, and over before I can think." (arousal high + pacing:
   relentless, near {building})
10. "Something gentle for a brain that has had a day." (comfort_level
    high + arousal low)
11. "Change my personality by the credits." (psych_rich high +
    eudaimonic high)
12. "A happy ending I do not have to feel guilty about." (ending_type:
    triumphant, near {uplifting} + hedonic high)

## 6. Bots

### 6.1 Open bots (fill empty seats, identity known)

Three shipped personas, each a pixel portrait + name + pitch style +
skill tier:

- **Marla** — ex-projectionist, seen everything, weary. Pitches short
  and deadpan. Skill: HARD (card choice peeks at true `fitPct`; she is
  the shark and the tutorial-by-example).
- **Dev** — film school dropout, pitches everything as "basically
  {famous vibe} but weirder". Skill: NORMAL (card choice by genre and
  title-keyword heuristics against the contract).
- **Bucket** — an actual bucket with googly eyes wearing a lanyard.
  Chaotic, sincere, loves everything. Skill: EASY (random card,
  gloriously confident pitch). Comic relief and the beatable floor.

Bot pitch generation goes through the `PitchBrain` interface (§10.3).
v1 ships a **template-bank brain** (no LLM required): assemble pitches
from persona-flavored templates + slots filled from the movie's visible
metadata only (title words, year, country, genres). Bots must never
quote hidden data (synopsis, vibe_sentence, mood_tags) inside a pitch —
that would read as impossible knowledge. HARD tier may use hidden fit
scores for **card selection and lane declaration only**, never for
pitch text.

Bot lanes: EASY always Straight; NORMAL declares Balderdash when its
heuristic fit estimate is low; HARD declares the lane the true `fitPct`
supports. Bots also vote: EASY random, NORMAL votes for the pitch whose
movie's genres best match the contract keywords, HARD votes the true
best fit.

### 6.2 Replicant mode (the hidden bot) — v1: 2 humans exactly

The old design (one hidden seat among device-passing humans) leaks
identity through the device flow itself — the seat that never gets
handed the device is the bot (§16, finding 3). Redesigned:

**Setup:** 2 humans + 2 **hidden seats**. Hidden seats never receive
the device and are openly absent ("two players are calling in from the
back room"). One hidden seat is **the Machine** (a `PitchBrain`
persona); the other is **a Ghost** — its pitches are drawn from a
shipped corpus of real human-written pitches (§7.3), keyed by contract
template, replayed verbatim. All four seats' pitches render anonymized
by seat letter with a uniform card style.

**The question is now content, not mechanics.** Both hidden seats run
one shared, role-complete **`HiddenSeatPolicy`** — a single code path,
parameterized only by where pitch text comes from:

- **Card choice**: genre/title-keyword heuristic against the contract
  (the NORMAL-tier rule from §6.1), seeded-RNG tie-break. Identical for
  both.
- **Lane declaration**: Balderdash when the same heuristic estimates a
  low fit, else Straight. Identical for both.
- **Side vote**: NORMAL-tier vote rule. Identical for both.
- **Customer turns**: a hidden Customer does **not** pitch (same as any
  Customer, §4.1) and has no device flow; its pick resolves
  automatically after a shared simulated "thinking" delay (one
  distribution for both seats) as a seeded-RNG pick among the pitched
  entries. Identical for both.
- **Pitch text** (the only divergence): the Machine generates via
  `PitchBrain`; the Ghost replays a corpus entry (§7.3).

**Trace-equivalence invariant:** swapping the two hidden seats' labels
must leave the observable UI event trace (screens, transitions, timing
distributions, pass-device prompts, scoring events) identical except
for pitch text content. Because every decision above runs through the
one shared policy, this holds by construction; the §14 test asserts it.
The only difference between the hidden seats is whether the words were
generated or written by a past human. That is the Turing test, played
fair.

**Accusation phase** (after round 8, before The Screening): each human
secretly picks which hidden seat letter is the Machine. Correct: +3.
Wrong: the Machine scores +2 per wrong human. Reveal is a ceremony: the
accused seat's blank portrait flickers into either a human face (the
Ghost's author credit: "pitch by a real person, 2026") or the machine.
If the Machine wins the whole match AND went unaccused by both humans,
it gets the "EMPLOYEE OF THE MONTH" title card.

**Anti-leak test (required, §14):** a Playwright test asserting that
the observable UI event trace (screens shown, transition timings,
pass-device prompts) is identical for the two hidden seats across a
scripted match — only pitch text may differ.

The Machine's pitch style: same `PitchBrain` interface, persona tuned
for plausibility — contractions, small typos at 4% word rate, lowercase
starts at 30%, occasional short pitches ("no notes. this is the one"),
never exceeding 110 chars. Ship it template-based; an LLM-backed brain
drops in later without game changes. Target unmasking rate ~50–60%
(§15).

## 7. Data

### 7.1 Movie record schema

The game consumes movies in exactly this JSON shape (a subset of the
Mooduel dataset schema; 30,611 movies exist in production):

```json
{
  "tmdb_id": 123456,
  "title": "The Cold Harvest",
  "year": 1987,
  "country": "BG",
  "runtime": 96,
  "genres": ["Drama", "Thriller"],
  "popularity": 1.34,
  "poster_url": "https://.../poster.jpg",
  "synopsis": "Two brothers return to their village...",
  "vibe_sentence": "A slow thaw of a film that trades hope in whispers.",
  "mood": {
    "valence": -0.4, "arousal": -0.2, "dominance": -0.5,
    "absorption": 0.7, "hedonic": 0.2, "eudaimonic": 0.8,
    "psych_rich": 0.75, "conversation_potential": 0.6,
    "comfort_level": 0.2,
    "emotional_arc": "man-in-a-hole",
    "pacing": "slow-burn",
    "ending_type": "bittersweet",
    "dominant_emotions": ["melancholy", "longing"],
    "mood_tags": ["wintry", "quiet", "rural"],
    "watch_context": ["solo", "rainy-sunday"]
  }
}
```

Numeric ranges: valence/arousal/dominance ∈ [−1, 1]; all other numeric
fields ∈ [0, 1]. Enums: emotional_arc {man-in-a-hole, oedipus,
riches-to-rags, icarus, rags-to-riches, steady, cinderella}; pacing
{slow-burn, building, steady, relentless, episodic}; ending_type
{triumphant, bittersweet, devastating, ambiguous, twist, uplifting,
unsettling}. Loader validation rules: §4.3.

### 7.2 Pools, obscurity, and mock data

- **Deal pool**: popularity below the 40th percentile of the dataset.
  The whole game depends on nobody recognizing the cards.
- **Screening pool** (finale only): popularity above the 60th
  percentile.
- Ship a `MovieSource` adapter (§10.3). v1 uses `MockMovieSource`
  backed by a generated `mock-movies.json` of **300 invented movies**
  matching the schema above, with plausible fake titles, years
  1948–2019, spread across the mood space, and **procedurally generated
  pixel posters** (§11.4 — no image API needed, and fake pixel posters
  fit the aesthetic perfectly). Production later swaps in an
  HTTP-backed source; the game must not care. v1's finale framing under
  mock data: §4.7.

### 7.3 Ghost pitch corpus (Replicant mode)

`ghost-pitches.json`: at least **10 human-written pitches per shipped
contract template family** (the 12 seed contracts of §5.2 → ≥120
pitches), each tagged with the contract it answers. These must be
genuinely human-written (author them by hand for v1; do not generate
them — generated ghosts would make the accusation unwinnable in the
wrong direction). Each entry: `{ "contract_family": "...", "text":
"...", "len": n }`. The Ghost replays an unused entry matching the
round's contract family, filtered to ±30 chars of the Machine's typical
length so length is not a tell.

## 8. Calibration signals

Every signal goes through the `SignalSink` interface (§10.3).

### 8.1 Event envelope (versioned)

Every event is wrapped:

```json
{
  "envelope_version": 1,
  "event_id": "m7f3k2-r4-e09",
  "match_id": "m7f3k2",
  "round": 4,
  "ts": 1770000000000,
  "dataset_version": "mock-1",
  "actor": { "seat": 2, "kind": "human" },
  "event": { ... }
}
```

- `match_id` = a random **match instance id** generated from host
  entropy once at match creation (LOBBY) and stored in state. It is
  **not** the RNG seed: the seed drives deterministic replay and may be
  reused across matches; the instance id is unique per started match,
  so two matches on the same seed produce distinct signal streams.
- `event_id` = `{match_id}-r{round}-e{counter}` from the match's
  monotonic counter — stable across resume/reducer retries of the same
  match (so sinks can dedupe on it as an idempotency key), distinct
  across independent matches.
- `actor.kind` ∈ {human, bot, machine, ghost}. **Downstream calibration
  must filter to `human`**; bot-originated events are emitted (for
  debugging) but are never labels.
- `ts` from the host clock at emit time (display/transport only; never
  used in game logic, which stays deterministic).
- `dataset_version` identifies the MovieSource build the mood scores
  came from, so a signal can be matched to the classifier version that
  produced the data it disputes.

### 8.2 Event bodies

```json
{ "type": "customer_pick", "tmdb_id": 1, "contract": {...},
  "fit_pct": 63, "candidates": [{"tmdb_id": 1, "fit_pct": 63},
  {"tmdb_id": 7, "fit_pct": 81}, {"tmdb_id": 4, "fit_pct": 22}],
  "pitch_text": "..." }

{ "type": "side_vote", "tmdb_id": 7, "contract": {...},
  "eligible": [{"tmdb_id": 7, "fit_pct": 81}, {"tmdb_id": 4, "fit_pct": 22}] }

{ "type": "overrule", "tmdb_id": 1, "contract": {...}, "fit_pct": 81,
  "chip": "clause_a" }

{ "type": "seen_it_verdict", "tmdb_id": 1, "contract": {...},
  "fit_pct": 63, "verdict_agrees": false, "chip": "clause_b" }
```

`candidates`/`eligible` carry the full choice set so a pick can be
interpreted relative to its alternatives (a pick of a 63 over an 81 is
information; a pick of a 63 over two 20s is not).

### 8.3 The two calibration moments

**Overrule the Critic** (everyone, after every reveal, 8s window): one
chunky button, "THE CRITIC IS WRONG". Tapping pops 3 chips naming the
two contract clauses in plain language plus the ending ("not that
cozy" / "not that intense" / "wrong about the ending") — pick one,
optional. The chip maps to `clause_a` / `clause_b` / `ending`.
Overruling costs and grants nothing; it exists because dunking on the
Critic is satisfying. If ≥2 players overrule the same verdict, the
Critic gets flustered (dedicated animation + line) — that moment is the
flywheel that keeps players tapping.

**The Seen It verdict** (only a player who flipped Seen It this round,
at reveal): after the stamp lands, the Critic turns to them: "You
claim to have watched this. Was I right?" One tap, agree/disagree,
optional clause chip. **No points either way** — this is deliberately
outside the scoring economy so the answer is honest (§16, finding 2).
This is the gold-standard label; `seen_it_verdict` events with
`actor.kind = human` are the highest-trust signals the game produces.

### 8.4 Sink contract (v1)

`SignalSink.emit(envelope)` is fire-and-forget from the reducer's
perspective, but the v1 `StorageSignalSink` must be durable and
exportable:

- Append to a localStorage-backed queue (cap 2,000 envelopes, FIFO
  eviction; `storage.ts` abstraction from §10.1).
- Dedupe on `event_id` on append.
- Settings screen: "Export play data" button → downloads the queue as
  JSON; "Clear" empties it. That is the v1 delivery path — explicit,
  honest, no silent network.
- The interface reserves `flush(): Promise<void>` for a future HTTP
  sink (batched POST, at-least-once, server dedupes on `event_id`).
  v1 implements it as a no-op.

## 9. Mood readout (per-player, end screen)

Track per player across the match: the mood vectors of every pitch they
voted for (side votes + customer picks). Mean these into a personal
tonight-vector (distance metric and fallbacks: §4.7). End screen
renders it as a pixel "receipt" printed from the Critic's chest slot: a
short human sentence built from the two most extreme dimensions via the
contract template bank, in the same craving register ("Tonight you kept
choosing slow and devastating. Seek help, or seek these:") followed by
3 nearest movies from the screening pool. Under mock data these are
labeled "from the archive" (§4.7's honesty rule applies here too).

## 10. Technical specification

### 10.1 Stack

- **Vite + vanilla TypeScript.** No UI framework: the overlay is a
  handful of DOM nodes; a plain `render(viewFor(state, seat))` function
  is smaller and easier to keep correct than reconciliation. (If a
  reactive escape hatch is ever needed, Svelte 5 is the fallback; do
  not start there.)
- **Three.js** (WebGL2), tree-shaken imports only — no OrbitControls,
  no PBR materials, no loaders beyond what the scene needs. Custom
  ShaderMaterials for the PS1 pass (§11.1). Budget check in CI: total
  JS ≤ 400KB gzipped excluding movie data.
- **pmndrs/postprocessing** for the post chain (it merges fullscreen
  passes; cheaper than Three's stock EffectComposer).
- No server; fully static build. State in memory + localStorage
  (match-in-progress resume) behind a thin `storage.ts` get/set/remove
  abstraction (swappable for Capacitor Preferences later).
- Game logic = pure reducer: `(GameState, Action) → GameState`,
  serializable JSON both sides, plus the `viewFor(state, seat)`
  projection (§4). All randomness through a seeded RNG in state
  (replayable matches, testable rounds, future server-driven
  multiplayer). The renderer and DOM layer consume views, never raw
  state.

### 10.2 Performance floor (non-negotiable)

- 60fps on a mid-tier laptop and a 2021 Android phone. The low-res
  render target (§11.1) is the lever: shading ~7% of native pixels
  makes the post chain cheap.
- Interactive in under 2 seconds on first load. Static build, no
  hydration, lazy-load nothing on the critical path.
- Test at 375px wide first; desktop is the enhancement. Touch targets
  ≥44px in CSS pixels regardless of render resolution.

### 10.3 Adapter interfaces (the seams for later Mooduel integration)

```ts
interface MovieSource {
  dealPool(count: number, opts: { seed: string }): Promise<Movie[]>;
  screeningPool(near: MoodVector, count: number): Promise<Movie[]>;
  datasetVersion(): string;
}
interface SignalSink {
  emit(envelope: SignalEnvelope): void;   // fire-and-forget
  flush(): Promise<void>;                 // no-op in v1
}
interface PitchBrain {
  pitch(visible: VisibleMovie, contract: Contract, persona: Persona): Promise<string>;
  // VisibleMovie = title, year, country, genres, runtime ONLY.
}
```

v1 ships: `MockMovieSource` (mock-movies.json), `StorageSignalSink`
(§8.4), `TemplatePitchBrain`, `LocalAuthProvider`, and
`LocalScoreStore` (§17). Nothing else in the codebase may import the
mock implementations directly — construction happens once at boot.

### 10.4 State machine

`LOBBY → DEALING → round loop [MOOD → PITCHING → VOTING → REVEAL →
OVERRULE] → (ACCUSATION if replicant) → SCREENING → RESULTS`.
Every transition is an action through the reducer. PASS_DEVICE states
wrap private phases per the §4.2 sequence when >1 human.

## 11. Art direction — "late-night video store on a dying CRT"

The reference cocktail: PS1-era 3D jank (Vagrant Story's mood, not its
budget) + GBA palette discipline + the fluorescent loneliness of a
video store at 11pm. Chosen because it does real work: pixel posters
make fake/obscure movies feel authentic, CRT fuzz excuses low-res
assets, and the nostalgia primes exactly the "weird tapes from the
back shelf" feeling the deal pool needs. Art-direction references: the
Haunted PS1 jam scene on itch.io.

### 11.1 Rendering

- Render the 3D scene to a **low-res WebGLRenderTarget** (~480×270;
  derive from aspect, keep the short edge ≤ 270) and upscale
  **inside WebGL** with nearest-neighbor sampling at a device pixel
  ratio capped at 2. Do not rely on CSS `image-rendering: pixelated`
  (uneven pixels at fractional DPR). UI text renders at native res on
  the HTML overlay — never rasterize body text into the low-res target.
- **PS1 vertex snap + affine UVs**: one custom ShaderMaterial, ~40
  lines of GLSL. Vertex: transform to clip space, perspective-divide,
  snap xy to a virtual grid (~160 steps), multiply back. Affine warp:
  scale UVs by w in the vertex shader, divide back in the fragment
  shader. These are settled recipes — follow the published Three.js
  PS1-shader writeups (Codrops 2024 jitter-shader tutorial; Roman
  Liutikov's "PS1 style graphics in Three.js") rather than inventing.
- Post chain (pmndrs/postprocessing, in order): Bayer 4×4 ordered
  dither + RGB555-style color quantization (custom Effect; Maxime
  Heckel's "Art of Dithering" recipe), scanlines, gentle vignette.
  All post effects toggleable in settings; respect
  `prefers-reduced-motion` (kill wobble and screen-shake, keep fades).
- Palette: one global 32-color palette, dark base. Night blues and
  CRT-phosphor greens for the room; one hot accent — **VHS-label
  magenta** — reserved for interactive/score moments only. Verdict
  stamps get dedicated green/yellow/red ramps within the palette.

### 11.2 The scene

One fixed camera on a low-poly table in a video store back room:
carpet, a shelf of tapes, a window with rain, a wall-mounted CRT where
the Critic lives. Cards are textured quads that deal, flip, and slide
with fast interruptible tweens (150–300ms, ease-out; hand-tweened or a
~3KB tween lib — not a framework). The Mood contract arrives as a
receipt printed from an old dot-matrix printer at the table's edge.
Seats are four simple chairs; occupied seats get pixel portrait cards
(personas, or player initials; blank anonymized letter cards for
Replicant-mode hidden seats).

### 11.3 The Critic

Lives inside the wall CRT: a pixel face, mostly eyes and eyebrows.
Delivers every verdict with a stamp sound and a one-liner from a
no-repeat line picker. Ship ≥8 lines per event type: match start, pitch
timeout, TRUE FIT (Straight), Full Balderdash, failed Balderdash
(declared bluff, movie actually fit), STRETCH, MISFIT (Straight), Seen
It flip, Seen It verdict ask, overrule received, ≥2 overrules
(flustered), accusation reveal, finale, results. Register: dry,
superior, secretly delighted. Sample lines (this exact register, no em
dashes): "A true fit. Disgusting. Well done." / "You sold them a
lawnmower and called it a spaceship. Three points." / "You tried to
lie and told the truth. That is the saddest thing I have seen all
week." / "Overruled? I have been rating movies since before you had a
library card." Sound design hooks even if v1 ships muted: deal, flip,
stamp, printer, dot-matrix screech, chiptune sting per verdict band.

### 11.4 Procedural pixel posters

Generate each mock movie's poster deterministically from its tmdb_id
seed: 96×144 canvas, palette-constrained, layered from a small kit
(gradient sky / silhouette figure / geometric motif / grain), title
rendered in one of 4 pixel display fonts, small wear marks. They should
look like tapes you have walked past a hundred times. This kit is also
the production fallback for movies with missing posters.

## 12. Copy voice (all player-facing text)

- No em dashes in prose. Use commas, parentheses, or restructure.
- Varied sentence rhythm, conversational, specific over vague.
- Banned vocabulary: delve, tapestry, leverage, foster, robust,
  pivotal, landscape, elevate, seamless.
- The Critic is a character; everything else (buttons, instructions) is
  plain and warm. Buttons say what they do: "Pitch it", "Print the
  mood", "Accuse".
- Contracts and mood readouts must sound like cravings a person would
  say out loud, never like dimension names.

## 13. Out of scope for v1

Real-time online multiplayer and matchmaking backends, real
(server-backed) auth, LLM-backed PitchBrain, 3-human Replicant mode,
the "Prove It" quiz, share cards, HTTP signal upload,
sound-on-by-default, native mobile wrappers, real-movie screening data.
Design nothing that blocks these; build none of them.

**In scope** (v1.3 addendum, §17): the full screen shell around the
game — title/landing, sign-in surface, local profiles, persistent score
history and stats, lobby with visible-but-stubbed online entry points,
and the finished results/win screen. Everything renders final-quality;
the backends behind them are local mocks behind adapter seams.

## 14. Definition of done

- [ ] Solo (1 human + Marla + Dev + Bucket) playable end to end,
      8 rounds + Screening, on desktop and 375px mobile
- [ ] Hotseat 2–4 humans with the §4.2 pass sequence and privacy
      screens
- [ ] Replicant mode (2 humans + Machine + Ghost) with accusation phase
      and reveal ceremony
- [ ] Anti-leak test: hidden-seat UI traces indistinguishable (§6.2)
- [ ] All scoring rules of §4.6 implemented and unit-tested against the
      reducer (fixed seeds, fixture rounds), including lane
      combinations, side-vote ties, and timeout paths
- [ ] `viewFor` projection unit-tested: no seat's view ever contains
      another seat's hand, pending pitch, lane, or hidden-seat
      provenance
- [ ] Calibration envelopes emitted per §8, durable + exportable
- [ ] Mood readouts + 3 archive picks on the results screen
- [ ] 60fps scene, <2s first interaction, reduced-motion respected
- [ ] Critic line bank ≥8 lines per event type, no-repeat picker
- [ ] 300-movie mock dataset + ≥120-pitch ghost corpus + procedural
      posters generating offline
- [ ] Bundle ≤400KB gzipped JS excluding movie data (CI check)
- [ ] Full screen flow of §17: title → profile gate → lobby → match →
      results → title, with local profiles, saved match history, and
      stats rendering on the profile screen
- [ ] Stubbed online tiles ("Find a table", "Challenge a friend")
      render in costume with honest coming-soon copy and are
      keyboard/touch reachable but inert
- [ ] Results screen writes a MatchSummary via ScoreStore; history
      survives reload
- [ ] Copy pass: every player-facing string obeys §12

## 15. Playtest questions (answer these after first playable)

1. Does a solo round fit in ~2 minutes, and does the reveal land as the
   peak of the loop?
2. Do the lanes feel like a real choice? Track declared-lane rates: if
   Balderdash exceeds ~60% of declarations, the bet is still too safe;
   tune the failed-Balderdash penalty (e.g. −1) before touching the
   bonuses.
3. Do players tap Overrule unprompted? If not, the Critic needs to be
   more insufferable, not the button bigger.
4. In Replicant mode, do humans catch the Machine above chance? Target
   roughly 50–60% accuracy. Higher: the brain needs better templates.
   Lower: fine, that is content ("EMPLOYEE OF THE MONTH").
5. Does the hotseat pacing (~3–4 min rounds at 4 humans) hold
   attention, or do waiting players disengage? If they disengage, the
   fix is spectator content on the table view during passes, not
   shorter timers.
6. Does anyone say "wait, we could actually watch that" at the finale,
   even knowing the archive is fictional? That is the signal to
   prioritize wiring the real dataset.

## 16. Review record — Codex adversarial review, 2026-08-06

Verdict: needs-attention (no-ship) on v1.0. All nine findings accepted;
v1.1 incorporates the fixes. Dispositions:

1. **Full Balderdash dominant** [high] — ACCEPTED. Fixed by the secret
   lane declaration (§4.4): equal +2 bonuses, each lane pays only when
   the data agrees with the declaration, so bluffing is a bet, not a
   free upgrade. Playtest gate in §15.2.
2. **Seen It is not a gold label** [high] — ACCEPTED. Token now records
   watched-status only; the calibration label comes from the separate
   non-scoring Seen It verdict question (§8.3).
3. **Replicant leaks via device flow** [high] — ACCEPTED. Redesigned
   (§6.2): hidden seats are openly device-less; two hidden seats
   (Machine + Ghost with a human-written pitch corpus, §7.3) make the
   accusation content-based. 3-human Replicant cut from v1. Anti-leak
   trace test required (§14).
4. **Hotseat cannot meet the round timer** [high] — ACCEPTED. Per-mode
   budgets, per-player timers, and an explicit pass sequence (§4.2);
   hotseat honestly budgeted at 3–4 min rounds.
5. **Calibration events unusable** [high] — ACCEPTED. Versioned
   envelope with ids, actor provenance, candidate sets, chips, and
   dataset version (§8.1–8.2); durable, dedupable, exportable sink
   (§8.4); bot events flagged and excluded from labels.
6. **Fit unit mismatch** [medium] — ACCEPTED. `fitPct` is canonical;
   rounding stage and loader validation specified (§4.3).
7. **Cosine distance invalid** [medium] — ACCEPTED. Normalized
   Euclidean with fallbacks and deterministic tie-breaks (§4.7).
8. **Mock data breaks the finale promise** [medium] — ACCEPTED. v1
   frames the finale as "from the archive"; watch-tonight copy is
   production-integration scope (§4.7, §9, §13).
9. **Side-vote winner undefined/impossible** [medium] — ACCEPTED.
   Target computed per-voter over eligible pitches; ties all score;
   abstain/timeout total (§4.6).

### Round 2 (v1.1 → v1.2, final plan round)

Codex confirmed the lane declaration removes the original dominance and
that the ×2 multiplier is lane-symmetric. Three residual findings, all
accepted and fixed in v1.2:

1. **Replicant hidden-seat behavior contradictory/incomplete** [high] —
   ACCEPTED. §6.2 now defines one role-complete `HiddenSeatPolicy`
   shared by Machine and Ghost (card choice, lane, side vote, Customer
   pick, no-pitch-as-Customer, no device flow) with pitch text as the
   sole divergence, plus an explicit trace-equivalence invariant under
   seat-label swap.
2. **Seen It multiplier ambiguous** [medium] — ACCEPTED. §4.6 now
   gives the explicit formula (`(winBase + laneBonus) × seenMultiplier`;
   Customer bonus never multiplied) with worked totals for every lane
   and verdict combination.
3. **Seed-derived event IDs can dedupe distinct matches** [medium] —
   ACCEPTED. §8.1 separates a host-entropy `match_id` (instance
   identity) from the deterministic RNG seed; event IDs build on the
   instance id.

Per protocol, plan review is closed after this round.

## 17. App shell, identity, and persistence (v1.3 addendum)

Added after review close as a scope amendment: the game gets its full
surrounding shell now, running entirely locally, so that real accounts
and online play later are adapter swaps, not rebuilds. Everything in
this section renders at final visual quality; only the backends are
local.

### 17.1 Screen map

```
BOOT → TITLE → PROFILE GATE → LOBBY → [match states, §10.4] → RESULTS
                                 ↑__________________________________|
```

- **TITLE (landing).** The video store frontage at night: neon logo
  buzzing, rain, the CRT glowing in the window. One primary action
  ("Open the store"), a profile chip for the signed-in profile (avatar
  + handle + win count), settings, and a data-export entry (§8.4).
  This is the game's face — give it the full costume.
- **PROFILE GATE.** Shown when no profile is active. Renders as a
  membership-card signup at the counter: pick a handle, pick a pixel
  portrait from the persona kit, "Get your card". A visually complete
  sign-in panel (email field + "Send me a sign-in link" button) is
  present but inert, styled normally, with honest copy underneath:
  "Online membership opens with the full release. For now your card
  lives on this device." Multiple local profiles per device; switching
  happens here.
- **LOBBY.** Mode select in costume: three active tiles (Solo,
  Hotseat, Replicant) plus two rendered-but-inert online tiles: "Find
  a table" (matchmaking) and "Challenge a friend" (async links), each
  with a small "coming soon" tape label. Seat setup (who's playing,
  bot fill preview), then deal.
- **RESULTS (win screen).** Already specced in part (§9); finalized
  here: final standings with lane stats for the match, the Critic's
  closing verdict, Replicant reveal ceremony when applicable, each
  player's mood-readout receipt, "Tonight's Screening" recap, then
  "Run it back" (rematch, same seats, new seed) and "Back to the
  store". On entry the reducer emits one `MatchSummary` per human
  profile through `ScoreStore.recordMatch`.
- **PROFILE screen** (from the TITLE chip): the membership card,
  all-time stats, match history (scrolling receipt list, most recent
  first), and an all-time mood tendency line rendered like the §9
  readout ("Lifetime: slow, devastating, no regrets").

### 17.2 Identity and score seams

```ts
interface Profile {
  id: string;            // host-entropy uuid, like match_id (§8.1)
  handle: string;        // 3–16 chars, player-chosen
  portraitSeed: number;  // pixel-portrait kit index
  createdAt: number;
}

interface AuthProvider {
  current(): Promise<Profile | null>;
  profiles(): Promise<Profile[]>;               // local multi-profile
  create(handle: string, portraitSeed: number): Promise<Profile>;
  activate(profileId: string): Promise<Profile>;
  signOut(): Promise<void>;                     // clears active only
}

interface MatchSummary {
  matchId: string;       // = §8.1 match_id
  endedAt: number;
  mode: "solo" | "hotseat" | "replicant";
  seats: { handle: string; kind: "human" | "bot" | "machine" | "ghost";
           score: number }[];
  profileSeat: number;   // which seat this summary's profile held
  won: boolean;
  laneStats: { straight: number; balderdash: number;
               fullBalderdash: number; failedBalderdash: number };
  seenItUsed: boolean;
  accusation?: { made: boolean; correct: boolean };
  tonightVector: number[];   // §9, normalized [0,1] dims
}

interface ScoreStore {
  recordMatch(profileId: string, s: MatchSummary): Promise<void>;
  history(profileId: string, limit: number): Promise<MatchSummary[]>;
  stats(profileId: string): Promise<ProfileStats>;  // derived, cached
}
```

`ProfileStats` (derived from history): matches, wins, total points,
Full Balderdash count, failed-Balderdash count, Seen It plays,
Replicant unmasking accuracy, favorite lane, and the all-time mean
tonight-vector.

v1 implementations: `LocalAuthProvider` and `LocalScoreStore`, both on
the `storage.ts` abstraction (§10.1), history capped at 200 summaries
per profile (FIFO). The future swap is a Supabase-backed pair speaking
the same interfaces; nothing outside boot may know which is live.
Profiles are not identity for calibration purposes — signal envelopes
(§8.1) keep their own actor model and never embed handles.

### 17.3 Rules for the stubs

- Inert online tiles must be honest: no fake spinners, no fake queues,
  no dead-end modals. One tap → tape label wiggles + one Critic line
  ("Online? Patience. The lines are not installed yet.").
- The sign-in panel must be real layout, real fields, disabled submit —
  so wiring it later is backend work only.
- All §12 voice rules apply to every string above (no em dashes in
  player-facing copy).
