-- Phase 2a/2b of the calibration replatform: served assignments + signals.
-- Applied 2026-07-17 via MCP (migration: calibration_signals_and_assignments).
--
-- Trust boundary: NO public policies on either table (deny by default).
-- All writes flow through the RPCs below, called by service-role API
-- routes that have already validated the signed anonymous session token.
-- Client-authored input into submit_signal is exactly (assignment_id,
-- client_event_id, choice); all context is copied from the locked
-- assignment and latency is computed from server timestamps.

create table if not exists assignments (
  id             uuid primary key default gen_random_uuid(),
  session_id     text not null,
  user_id        uuid references profiles(id),
  game           text not null,
  game_version   text not null,
  kind           text not null check (kind in ('pairwise','categorical','scalar')),
  dimension      text not null,
  movie_a        integer not null references movies(tmdb_id),
  movie_b        integer references movies(tmdb_id),
  displayed_order text,
  prompt_version text not null,
  policy_version text,
  dealt_at       timestamptz not null default now(),
  consumed_at    timestamptz,
  check (kind <> 'pairwise' or movie_b is not null),
  check (kind = 'pairwise' or movie_b is null)
);

create index if not exists idx_assignments_session on assignments(session_id, dealt_at desc);

alter table assignments enable row level security;
-- no policies: deny anon/authed clients entirely; service role bypasses RLS

create table if not exists calibration_signals (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null unique references assignments(id),
  client_event_id uuid not null unique,
  session_id      text not null,
  user_id         uuid references profiles(id),
  game            text not null,
  game_version    text not null,
  kind            text not null check (kind in ('pairwise','categorical','scalar')),
  dimension       text not null,
  movie_a         integer not null references movies(tmdb_id),
  movie_b         integer references movies(tmdb_id),
  choice          text not null,
  latency_ms      integer,
  received_at     timestamptz not null default now(),
  check (kind <> 'pairwise' or choice in ('a','b'))
);

create index if not exists idx_signals_dimension on calibration_signals(dimension, kind);
create index if not exists idx_signals_session on calibration_signals(session_id, received_at desc);

alter table calibration_signals enable row level security;
-- no policies: raw stream is not public; aggregates are published separately

-- ── deal_assignment: issuance path with DB-level caps ──
create or replace function deal_assignment(
  p_session_id text,
  p_user_id uuid,
  p_game text,
  p_game_version text,
  p_kind text,
  p_dimension text,
  p_movie_a integer,
  p_movie_b integer,
  p_displayed_order text,
  p_prompt_version text,
  p_policy_version text
) returns uuid as $$
declare
  v_dealt_today integer;
  v_id uuid;
begin
  select count(*) into v_dealt_today from assignments
    where session_id = p_session_id and dealt_at > now() - interval '24 hours';
  if v_dealt_today >= 1000 then
    raise exception 'assignment cap reached for session';
  end if;

  insert into assignments (session_id, user_id, game, game_version, kind, dimension,
                           movie_a, movie_b, displayed_order, prompt_version, policy_version)
  values (p_session_id, p_user_id, p_game, p_game_version, p_kind, p_dimension,
          p_movie_a, p_movie_b, p_displayed_order, p_prompt_version, p_policy_version)
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer;

revoke execute on function deal_assignment from public, anon, authenticated;

-- ── submit_signal: the only write path into calibration_signals ──
create or replace function submit_signal(
  p_assignment_id uuid,
  p_client_event_id uuid,
  p_choice text,
  p_session_id text,
  p_user_id uuid
) returns text as $$
declare
  a assignments%rowtype;
  v_today integer;
begin
  -- idempotency: same client_event_id -> duplicate, not error
  if exists (select 1 from calibration_signals where client_event_id = p_client_event_id) then
    return 'duplicate';
  end if;

  select * into a from assignments where id = p_assignment_id for update;
  if not found then return 'unknown-assignment'; end if;
  if a.session_id <> p_session_id then return 'session-mismatch'; end if;
  if a.consumed_at is not null then return 'already-consumed'; end if;
  if a.dealt_at < now() - interval '30 minutes' then return 'expired'; end if;
  if a.kind = 'pairwise' and p_choice not in ('a','b') then return 'invalid-choice'; end if;

  select count(*) into v_today from calibration_signals
    where session_id = p_session_id and received_at > now() - interval '24 hours';
  if v_today >= 500 then return 'rate-capped'; end if;

  insert into calibration_signals (assignment_id, client_event_id, session_id, user_id,
    game, game_version, kind, dimension, movie_a, movie_b, choice, latency_ms)
  values (a.id, p_client_event_id, a.session_id, coalesce(p_user_id, a.user_id),
    a.game, a.game_version, a.kind, a.dimension, a.movie_a, a.movie_b, p_choice,
    least(2147483647, (extract(epoch from (now() - a.dealt_at)) * 1000)::bigint)::integer);

  update assignments set consumed_at = now() where id = a.id;
  return 'accepted';
end;
$$ language plpgsql security definer;

revoke execute on function submit_signal from public, anon, authenticated;
