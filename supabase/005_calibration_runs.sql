-- Phase 2d: immutable calibration run tables + atomic promotion.
-- Applied 2026-07-17 via MCP (migration: calibration_runs_and_promotion).
-- The aggregation job (scripts/calibration/aggregate.mjs) writes complete
-- runs here; promote_calibration_run() is the only path into the serving
-- columns — advisory-locked, set-equality proven both directions, row-count
-- asserted, all inside one transaction.

alter table movies add column if not exists calibration_version text;

create table if not exists calibration_runs (
  run_id        text primary key,
  status        text not null default 'running'
                check (status in ('running','completed','failed','promoted')),
  policy_version text,
  diagnostics   jsonb,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  promoted_at   timestamptz
);

create table if not exists movie_scores_calibrated (
  run_id        text not null references calibration_runs(run_id),
  movie_id      integer not null references movies(tmdb_id),
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
  n_votes       jsonb not null default '{}',
  posterior_var jsonb not null default '{}',
  primary key (run_id, movie_id)
);

alter table calibration_runs enable row level security;
drop policy if exists "Runs are publicly readable" on calibration_runs;
create policy "Runs are publicly readable" on calibration_runs for select using (true);

alter table movie_scores_calibrated enable row level security;
drop policy if exists "Calibrated scores are publicly readable" on movie_scores_calibrated;
create policy "Calibrated scores are publicly readable" on movie_scores_calibrated for select using (true);
-- writes: service role only (no insert/update policies)

create or replace function promote_calibration_run(p_run_id text) returns text as $$
declare
  v_status text;
  v_missing integer;
  v_extra integer;
  v_expected integer;
  v_updated integer;
begin
  perform pg_advisory_xact_lock(hashtext('mooduel-calibration-promotion'));

  select status into v_status from calibration_runs where run_id = p_run_id;
  if v_status is null then return 'unknown-run'; end if;
  if v_status <> 'completed' then return 'not-completed:' || v_status; end if;

  select count(*) into v_missing from movies m
    where not exists (select 1 from movie_scores_calibrated c
                      where c.run_id = p_run_id and c.movie_id = m.tmdb_id);
  select count(*) into v_extra from movie_scores_calibrated c
    where c.run_id = p_run_id
      and not exists (select 1 from movies m where m.tmdb_id = c.movie_id);
  if v_missing > 0 or v_extra > 0 then
    return format('set-mismatch missing=%s extra=%s', v_missing, v_extra);
  end if;

  select count(*) into v_expected from movies;

  update movies m set
    valence = c.valence, arousal = c.arousal, dominance = c.dominance,
    absorption = c.absorption, hedonic = c.hedonic, eudaimonic = c.eudaimonic,
    psych_rich = c.psych_rich, emotional_arc = c.emotional_arc,
    dominant_emotions = c.dominant_emotions, mood_tags = c.mood_tags,
    watch_context = c.watch_context, vibe_sentence = c.vibe_sentence,
    pacing = c.pacing, ending_type = c.ending_type,
    comfort_level = c.comfort_level, safety_warnings = c.safety_warnings,
    conversation_potential = c.conversation_potential,
    calibration_version = p_run_id,
    updated_at = now()
  from movie_scores_calibrated c
  where c.run_id = p_run_id and c.movie_id = m.tmdb_id;

  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception 'promotion updated % rows, expected %', v_updated, v_expected;
  end if;

  update calibration_runs set status = 'promoted', promoted_at = now()
    where run_id = p_run_id;
  return 'promoted';
end;
$$ language plpgsql security definer;

revoke execute on function promote_calibration_run from public, anon, authenticated;
