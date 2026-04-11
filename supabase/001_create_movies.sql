-- Mooduel movies table
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

-- Indexes for common queries
create index if not exists idx_movies_pacing on movies(pacing);
create index if not exists idx_movies_ending on movies(ending_type);
create index if not exists idx_movies_comfort on movies(comfort_level);
create index if not exists idx_movies_year on movies(year);
create index if not exists idx_movies_title on movies using gin (to_tsvector('english', title));
create index if not exists idx_movies_vibe on movies using gin (to_tsvector('english', vibe_sentence));

-- RLS: public read, service-role write
alter table movies enable row level security;
create policy "Movies are publicly readable" on movies for select using (true);
