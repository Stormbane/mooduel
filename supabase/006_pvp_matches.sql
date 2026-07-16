-- Phase 3: IP-hash issuance caps + PvP server-authoritative concurrency
-- skeleton. Applied 2026-07-17 via MCP (migration: ip_caps_and_pvp_matches_v2).
--
-- Game-specific rules (dealing hands, trick resolution) are Phase 4; this
-- layer owns identity, seats, single-claim invites, turn order, optimistic
-- versioning, idempotency, deadlines, and forfeit. match_secrets has NO
-- RLS policies in any direction — hands are never client-readable; players
-- see their own hand only through get_hand() via service-role routes.
-- Smoke-tested: self-join, out-of-turn, stale-version, replay, stranger
-- move, and forfeit all behave (see plan Review log round 2, finding 12).

drop function if exists deal_assignment(text, uuid, text, text, text, text, integer, integer, text, text, text);

alter table assignments add column if not exists ip_hash text;
create index if not exists idx_assignments_ip on assignments(ip_hash, dealt_at desc);

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
  p_policy_version text,
  p_ip_hash text default null
) returns uuid as $$
declare
  v_count integer;
  v_id uuid;
begin
  select count(*) into v_count from assignments
    where session_id = p_session_id and dealt_at > now() - interval '24 hours';
  if v_count >= 1000 then raise exception 'assignment cap reached for session'; end if;

  if p_ip_hash is not null then
    select count(*) into v_count from assignments
      where ip_hash = p_ip_hash and dealt_at > now() - interval '24 hours';
    if v_count >= 3000 then raise exception 'assignment cap reached for ip'; end if;
  end if;

  insert into assignments (session_id, user_id, game, game_version, kind, dimension,
                           movie_a, movie_b, displayed_order, prompt_version, policy_version, ip_hash)
  values (p_session_id, p_user_id, p_game, p_game_version, p_kind, p_dimension,
          p_movie_a, p_movie_b, p_displayed_order, p_prompt_version, p_policy_version, p_ip_hash)
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer;

revoke execute on function deal_assignment(text, uuid, text, text, text, text, integer, integer, text, text, text, text) from public, anon, authenticated;

create table if not exists matches (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,
  game           text not null,
  status         text not null default 'open'
                 check (status in ('open','active','finished','expired','forfeit')),
  state_version  integer not null default 0,
  current_turn   smallint,
  config         jsonb not null default '{}',
  created_by_user uuid references profiles(id),
  created_by_session text,
  turn_deadline  timestamptz,
  winner_seat    smallint,
  created_at     timestamptz not null default now(),
  check (num_nonnulls(created_by_user, created_by_session) = 1)
);

create table if not exists match_players (
  match_id   uuid not null references matches(id) on delete cascade,
  seat       smallint not null,
  user_id    uuid references profiles(id),
  session_id text,
  is_bot     boolean not null default false,
  score      integer not null default 0,
  joined_at  timestamptz not null default now(),
  primary key (match_id, seat),
  check (is_bot or num_nonnulls(user_id, session_id) = 1)
);
create unique index if not exists idx_match_players_user on match_players(match_id, user_id) where user_id is not null;
create unique index if not exists idx_match_players_session on match_players(match_id, session_id) where session_id is not null;

create table if not exists match_secrets (
  match_id   uuid not null references matches(id) on delete cascade,
  seat       smallint not null,
  hand       jsonb not null default '[]',
  deck       jsonb not null default '[]',
  primary key (match_id, seat)
);

create table if not exists match_moves (
  id              bigint generated always as identity primary key,
  match_id        uuid not null references matches(id) on delete cascade,
  seat            smallint not null,
  idempotency_key uuid not null,
  state_version   integer not null,
  move            jsonb not null,
  created_at      timestamptz not null default now(),
  unique (match_id, idempotency_key)
);

alter table matches enable row level security;
drop policy if exists "Matches are publicly readable" on matches;
create policy "Matches are publicly readable" on matches for select using (true);
alter table match_players enable row level security;
drop policy if exists "Match players are publicly readable" on match_players;
create policy "Match players are publicly readable" on match_players for select using (true);
alter table match_moves enable row level security;
drop policy if exists "Match moves are publicly readable" on match_moves;
create policy "Match moves are publicly readable" on match_moves for select using (true);
alter table match_secrets enable row level security;
-- match_secrets: NO policies at all — never client-readable

create or replace function _match_seat_for(p_match uuid, p_user uuid, p_session text)
returns smallint as $$
  select seat from match_players
   where match_id = p_match
     and ((p_user is not null and user_id = p_user)
       or (p_session is not null and session_id = p_session))
   limit 1;
$$ language sql stable;

create or replace function create_match(
  p_game text,
  p_config jsonb,
  p_user uuid,
  p_session text
) returns table (match_id uuid, code text) as $$
declare
  v_id uuid;
  v_code text := lower(substr(md5(gen_random_uuid()::text), 1, 10));
begin
  if num_nonnulls(p_user, p_session) <> 1 then raise exception 'exactly one identity required'; end if;
  insert into matches (code, game, config, created_by_user, created_by_session)
  values (v_code, p_game, coalesce(p_config, '{}'), p_user, p_session)
  returning id into v_id;
  insert into match_players (match_id, seat, user_id, session_id)
  values (v_id, 1, p_user, p_session);
  return query select v_id, v_code;
end;
$$ language plpgsql security definer;

create or replace function join_match(
  p_code text,
  p_user uuid,
  p_session text,
  p_as_bot boolean default false
) returns uuid as $$
declare
  m matches%rowtype;
begin
  if not p_as_bot and num_nonnulls(p_user, p_session) <> 1 then
    raise exception 'exactly one identity required';
  end if;

  select * into m from matches where code = p_code for update;
  if not found then raise exception 'unknown match code'; end if;
  if m.status <> 'open' then raise exception 'match not open'; end if;
  if _match_seat_for(m.id, p_user, p_session) is not null then
    raise exception 'identity already seated in this match';
  end if;

  insert into match_players (match_id, seat, user_id, session_id, is_bot)
  values (m.id, 2, p_user, p_session, p_as_bot);

  update matches set status = 'active', current_turn = 1,
    state_version = state_version + 1,
    turn_deadline = now() + interval '48 hours'
    where id = m.id;
  return m.id;
end;
$$ language plpgsql security definer;

create or replace function submit_move(
  p_match uuid,
  p_user uuid,
  p_session text,
  p_expected_version integer,
  p_idempotency_key uuid,
  p_move jsonb
) returns table (status text, new_version integer) as $$
declare
  m matches%rowtype;
  v_seat smallint;
begin
  if exists (select 1 from match_moves where match_id = p_match and idempotency_key = p_idempotency_key) then
    select 'duplicate', matches.state_version into status, new_version from matches where id = p_match;
    return next;
    return;
  end if;

  select * into m from matches where id = p_match for update;
  if not found then status := 'unknown-match'; new_version := null; return next; return; end if;

  v_seat := _match_seat_for(p_match, p_user, p_session);
  if v_seat is null then status := 'not-a-participant'; new_version := m.state_version; return next; return; end if;

  if m.status = 'active' and m.turn_deadline < now() then
    update matches set status = 'forfeit', winner_seat = case when m.current_turn = 1 then 2 else 1 end,
      state_version = m.state_version + 1 where id = p_match;
    status := 'deadline-forfeit'; new_version := m.state_version + 1; return next; return;
  end if;

  if m.status <> 'active' then status := 'match-not-active:' || m.status; new_version := m.state_version; return next; return; end if;
  if m.current_turn <> v_seat then status := 'not-your-turn'; new_version := m.state_version; return next; return; end if;
  if m.state_version <> p_expected_version then status := 'version-conflict'; new_version := m.state_version; return next; return; end if;

  insert into match_moves (match_id, seat, idempotency_key, state_version, move)
  values (p_match, v_seat, p_idempotency_key, m.state_version + 1, p_move);

  update matches set
    state_version = m.state_version + 1,
    current_turn = case when m.current_turn = 1 then 2 else 1 end,
    turn_deadline = now() + interval '48 hours'
    where id = p_match;

  status := 'accepted'; new_version := m.state_version + 1; return next;
end;
$$ language plpgsql security definer;

create or replace function forfeit_match(p_match uuid, p_user uuid, p_session text)
returns text as $$
declare
  m matches%rowtype;
  v_seat smallint;
begin
  select * into m from matches where id = p_match for update;
  if not found then return 'unknown-match'; end if;
  v_seat := _match_seat_for(p_match, p_user, p_session);
  if v_seat is null then return 'not-a-participant'; end if;
  if m.status not in ('open','active') then return 'match-not-active:' || m.status; end if;
  update matches set status = 'forfeit',
    winner_seat = case when v_seat = 1 then 2 else 1 end,
    state_version = m.state_version + 1
    where id = p_match;
  return 'forfeited';
end;
$$ language plpgsql security definer;

create or replace function get_hand(p_match uuid, p_user uuid, p_session text)
returns jsonb as $$
declare
  v_seat smallint;
begin
  v_seat := _match_seat_for(p_match, p_user, p_session);
  if v_seat is null then return null; end if;
  return (select hand from match_secrets where match_id = p_match and seat = v_seat);
end;
$$ language plpgsql security definer;

revoke execute on function create_match, join_match, submit_move, forfeit_match, get_hand, _match_seat_for from public, anon, authenticated;
