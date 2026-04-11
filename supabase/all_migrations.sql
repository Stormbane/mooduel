-- ══════════════════════════════════════════════════
-- MOODUEL + BT-CALIBRATE: Complete database setup
-- Paste this into Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════

-- ── Movies table ──
create table if not exists movies (
  tmdb_id       integer primary key,
  title         text not null,
  year          smallint,
  genres        text[] not null default '{}',
  runtime       smallint,
  tmdb_rating   real,
  poster_path   text,
  valence       real not null,
  arousal       real not null,
  dominance     real not null,
  absorption    real not null,
  hedonic       real not null,
  eudaimonic    real not null,
  psych_rich    real not null,
  emotional_arc text not null,
  dominant_emotions text[] not null default '{}',
  mood_tags     text[] not null default '{}',
  watch_context text[] not null default '{}',
  vibe_sentence text not null,
  pacing        text not null,
  ending_type   text not null,
  comfort_level real not null,
  safety_warnings text[] not null default '{}',
  conversation_potential real not null,
  rt_critic     smallint,
  rt_audience   smallint,
  imdb_rating   real,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_movies_pacing on movies(pacing);
create index if not exists idx_movies_ending on movies(ending_type);
create index if not exists idx_movies_comfort on movies(comfort_level);
create index if not exists idx_movies_year on movies(year);
create index if not exists idx_movies_title on movies using gin (to_tsvector('english', title));
create index if not exists idx_movies_vibe on movies using gin (to_tsvector('english', vibe_sentence));

alter table movies enable row level security;
drop policy if exists "Movies are publicly readable" on movies;
create policy "Movies are publicly readable" on movies for select using (true);

-- ── Profiles (extends auth.users) ──
create table if not exists profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text,
  avatar_url      text,
  reputation      integer not null default 0,
  created_at      timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

alter table profiles enable row level security;
drop policy if exists "Profiles are publicly readable" on profiles;
create policy "Profiles are publicly readable" on profiles for select using (true);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- ── Corrections ──
create table if not exists corrections (
  id              uuid primary key default gen_random_uuid(),
  movie_id        integer not null,
  author_id       uuid not null references profiles(id),
  status          text not null default 'pending'
                  check (status in ('pending', 'accepted', 'rejected', 'superseded')),
  proposed_values jsonb not null,
  original_values jsonb not null,
  justification   text not null,
  upvotes         integer not null default 0,
  downvotes       integer not null default 0,
  net_score       integer generated always as (upvotes - downvotes) stored,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create index if not exists idx_corrections_movie on corrections(movie_id, status);
create index if not exists idx_corrections_author on corrections(author_id);
create index if not exists idx_corrections_pending on corrections(status, net_score desc)
  where status = 'pending';

alter table corrections enable row level security;
drop policy if exists "Corrections are publicly readable" on corrections;
create policy "Corrections are publicly readable" on corrections for select using (true);
drop policy if exists "Authenticated users can submit corrections" on corrections;
create policy "Authenticated users can submit corrections" on corrections for insert
  with check (auth.uid() = author_id);

-- ── Votes ──
create table if not exists votes (
  id              uuid primary key default gen_random_uuid(),
  correction_id   uuid not null references corrections(id) on delete cascade,
  user_id         uuid not null references profiles(id),
  value           smallint not null check (value in (-1, 1)),
  created_at      timestamptz not null default now(),
  unique(correction_id, user_id)
);

create index if not exists idx_votes_correction on votes(correction_id);

alter table votes enable row level security;
drop policy if exists "Votes are publicly readable" on votes;
create policy "Votes are publicly readable" on votes for select using (true);
drop policy if exists "Authenticated users can vote" on votes;
create policy "Authenticated users can vote" on votes for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can change own vote" on votes;
create policy "Users can change own vote" on votes for update using (auth.uid() = user_id);
drop policy if exists "Users can remove own vote" on votes;
create policy "Users can remove own vote" on votes for delete using (auth.uid() = user_id);

-- ── Reputation Events ──
create table if not exists reputation_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id),
  event_type      text not null,
  points          integer not null,
  correction_id   uuid references corrections(id),
  created_at      timestamptz not null default now()
);

create index if not exists idx_rep_events_user on reputation_events(user_id, created_at desc);

alter table reputation_events enable row level security;
drop policy if exists "Reputation events are publicly readable" on reputation_events;
create policy "Reputation events are publicly readable" on reputation_events for select using (true);

-- ── Cast Vote (atomic function) ──
create or replace function cast_vote(
  p_correction_id uuid,
  p_user_id uuid,
  p_value smallint
) returns void as $$
declare
  existing_value smallint;
begin
  if exists (select 1 from corrections where id = p_correction_id and author_id = p_user_id) then
    raise exception 'Cannot vote on your own correction';
  end if;

  select value into existing_value from votes
    where correction_id = p_correction_id and user_id = p_user_id;

  if existing_value is not null then
    if existing_value = p_value then
      return;
    end if;
    update votes set value = p_value
      where correction_id = p_correction_id and user_id = p_user_id;
    update corrections set
      upvotes = upvotes + (case when p_value = 1 then 1 else 0 end)
                        - (case when existing_value = 1 then 1 else 0 end),
      downvotes = downvotes + (case when p_value = -1 then 1 else 0 end)
                            - (case when existing_value = -1 then 1 else 0 end)
      where id = p_correction_id;
  else
    insert into votes (correction_id, user_id, value)
      values (p_correction_id, p_user_id, p_value);
    update corrections set
      upvotes = upvotes + (case when p_value = 1 then 1 else 0 end),
      downvotes = downvotes + (case when p_value = -1 then 1 else 0 end)
      where id = p_correction_id;
  end if;
end;
$$ language plpgsql security definer;

-- ══════════════════════════════════════════════════
-- Done! All tables, indexes, RLS, and functions created.
-- Next step: run the seed script to load 30K movies.
-- ══════════════════════════════════════════════════
