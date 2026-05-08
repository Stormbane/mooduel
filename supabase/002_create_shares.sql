-- Share results: stateless share pages keyed by short base62 token
create table if not exists share_results (
  token         text primary key,
  game          text not null,
  payload       jsonb not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_share_results_created on share_results(created_at desc);
create index if not exists idx_share_results_game on share_results(game);

-- RLS: anyone can read (crawlable share pages), anyone can create (no auth required)
alter table share_results enable row level security;
create policy "Anyone can read shares" on share_results for select using (true);
create policy "Anyone can create shares" on share_results for insert with check (true);
