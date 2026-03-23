-- ═══════════════════════════════════════════════════════
-- PS Game Deals Radar v1.0.0 — Database Schema
-- Run this ONCE in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ───────── USER PROFILES ─────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  psn_username text,
  plan text default 'free' check (plan in ('free', 'pro', 'ultimate')),
  stripe_customer_id text,
  stripe_subscription_id text,
  billing_cycle text default 'monthly',
  subscription_start timestamptz,
  notification_push boolean default true,
  notification_email boolean default false,
  notification_telegram boolean default false,
  telegram_chat_id text,
  default_region text default 'US',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ───────── GAMES ─────────
create table public.games (
  id serial primary key,
  ps_store_id text unique not null,
  title text not null,
  slug text,
  image_url text,
  developer text,
  genre text,
  platforms text[] default '{}',
  release_date date,
  metacritic_score integer,
  user_rating numeric(3,1),
  ps_plus_tier text check (ps_plus_tier in ('Essential', 'Extra', 'Premium', null)),
  size text,
  players text,
  online_play boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_games_ps_store_id on public.games(ps_store_id);
create index idx_games_title on public.games using gin(to_tsvector('english', title));

-- ───────── PRICES (current) ─────────
create table public.prices (
  id serial primary key,
  game_id integer references public.games(id) on delete cascade,
  region text not null default 'US',
  original_price numeric(10,2),
  sale_price numeric(10,2),
  discount_percent integer default 0,
  currency text default 'USD',
  sale_end_date timestamptz,
  is_on_sale boolean default false,
  ps_plus_price numeric(10,2),
  last_scraped_at timestamptz default now(),
  unique(game_id, region)
);

create index idx_prices_game_region on public.prices(game_id, region);
create index idx_prices_discount on public.prices(discount_percent desc);

-- ───────── PRICE HISTORY ─────────
create table public.price_history (
  id serial primary key,
  game_id integer references public.games(id) on delete cascade,
  region text not null default 'US',
  price numeric(10,2) not null,
  original_price numeric(10,2),
  discount_percent integer default 0,
  recorded_at timestamptz default now()
);

create index idx_price_history_game on public.price_history(game_id, region, recorded_at desc);

-- ───────── WISHLISTS ─────────
create table public.wishlists (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  game_id integer references public.games(id) on delete cascade,
  added_at timestamptz default now(),
  unique(user_id, game_id)
);

create index idx_wishlists_user on public.wishlists(user_id);

-- ───────── OWNED GAMES ─────────
create table public.owned_games (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  game_id integer references public.games(id) on delete cascade,
  added_at timestamptz default now(),
  unique(user_id, game_id)
);

-- ───────── ALERT RULES ─────────
create table public.alert_rules (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  game_id integer references public.games(id) on delete cascade null, -- null = global rule
  is_enabled boolean default true,
  alert_type text default 'both' check (alert_type in ('discount', 'price', 'both')),
  min_discount integer default 50,
  max_price numeric(10,2) default 30.00,
  created_at timestamptz default now(),
  unique(user_id, game_id)
);

create index idx_alert_rules_user on public.alert_rules(user_id);

-- ───────── NOTIFICATION LOG ─────────
create table public.notifications (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  game_id integer references public.games(id) on delete cascade,
  channel text not null check (channel in ('push', 'email', 'telegram')),
  message text,
  sent_at timestamptz default now(),
  read boolean default false
);

create index idx_notifications_user on public.notifications(user_id, sent_at desc);

-- ───────── SCRAPE LOG ─────────
create table public.scrape_log (
  id serial primary key,
  region text,
  games_scraped integer default 0,
  games_updated integer default 0,
  errors integer default 0,
  duration_ms integer,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- ───────── ROW LEVEL SECURITY ─────────
alter table public.profiles enable row level security;
alter table public.wishlists enable row level security;
alter table public.owned_games enable row level security;
alter table public.alert_rules enable row level security;
alter table public.notifications enable row level security;

-- Users can only read/update their own profile
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Users can manage their own wishlists
create policy "Users manage wishlists" on public.wishlists for all using (auth.uid() = user_id);

-- Users can manage their own owned games
create policy "Users manage owned" on public.owned_games for all using (auth.uid() = user_id);

-- Users can manage their own alert rules
create policy "Users manage alerts" on public.alert_rules for all using (auth.uid() = user_id);

-- Users can read their own notifications
create policy "Users read notifs" on public.notifications for select using (auth.uid() = user_id);
create policy "Users update notifs" on public.notifications for update using (auth.uid() = user_id);

-- Games and prices are publicly readable
alter table public.games enable row level security;
create policy "Games are public" on public.games for select using (true);

alter table public.prices enable row level security;
create policy "Prices are public" on public.prices for select using (true);

alter table public.price_history enable row level security;
create policy "History is public" on public.price_history for select using (true);

-- ───────── HELPER FUNCTIONS ─────────

-- Get price stats for a game
create or replace function get_price_stats(p_game_id integer, p_region text default 'US')
returns json as $$
  select json_build_object(
    'lowest_ever', min(price),
    'highest_ever', max(price),
    'average_price', round(avg(price)::numeric, 2),
    'times_on_sale', count(*) filter (where discount_percent > 0),
    'total_records', count(*)
  )
  from public.price_history
  where game_id = p_game_id and region = p_region;
$$ language sql stable;

-- Get games matching user's alert rules
create or replace function get_alerted_games(p_user_id uuid)
returns setof public.games as $$
  select distinct g.* from public.games g
  join public.prices p on p.game_id = g.id and p.is_on_sale = true
  join public.alert_rules ar on ar.user_id = p_user_id and ar.is_enabled = true
  where (
    (ar.game_id is null or ar.game_id = g.id)
    and (
      (ar.alert_type in ('discount', 'both') and p.discount_percent >= ar.min_discount)
      or
      (ar.alert_type in ('price', 'both') and p.sale_price <= ar.max_price)
    )
  );
$$ language sql stable;
