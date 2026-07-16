-- Phase 1b of the calibration replatform: provenance tables.
-- Applied 2026-07-17 via MCP (migration: score_provenance_tables).
-- score_patches: the enum-repair ledger (service-role writes only).
-- movie_scores_baseline: immutable copy of the normalized LLM prior.

create table if not exists score_patches (
  id            bigint generated always as identity primary key,
  movie_id      integer not null references movies(tmdb_id),
  field         text not null,
  old_value     text,
  new_value     text,  -- null means the value was dropped
  method        text not null check (method in ('mechanical-map','curated-map','llm-reclassify')),
  rule          text,
  run_id        text not null,
  model         text,
  prompt_version text,
  raw_response_ref text,
  applied_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_score_patches_movie on score_patches(movie_id);
create index if not exists idx_score_patches_run on score_patches(run_id);

alter table score_patches enable row level security;
drop policy if exists "Patches are publicly readable" on score_patches;
create policy "Patches are publicly readable" on score_patches for select using (true);
-- no insert/update/delete policies: service-role only

create table if not exists movie_scores_baseline (
  tmdb_id       integer primary key references movies(tmdb_id),
  source        text not null default 'llm-haiku45-v2',
  valence       real not null,
  arousal       real not null,
  dominance     real not null,
  absorption    real not null,
  hedonic       real not null,
  eudaimonic    real not null,
  psych_rich    real not null,
  emotional_arc text not null,
  dominant_emotions text[] not null,
  mood_tags     text[] not null,
  watch_context text[] not null,
  vibe_sentence text not null,
  pacing        text not null,
  ending_type   text not null,
  comfort_level real not null,
  safety_warnings text[] not null,
  conversation_potential real not null,
  snapshotted_at timestamptz not null default now()
);

alter table movie_scores_baseline enable row level security;
drop policy if exists "Baseline is publicly readable" on movie_scores_baseline;
create policy "Baseline is publicly readable" on movie_scores_baseline for select using (true);
-- no write policies: service-role only, written once by the apply script
