-- DOLLY OS schema. Run once in the Supabase SQL editor.
-- All access goes through the app's server routes with the service-role key,
-- so RLS is enabled with no policies (deny-all to anon).

create extension if not exists "pgcrypto";

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  week_number int not null,
  month text not null default 'august',
  status text not null default 'todo' check (status in ('todo','doing','done','killed')),
  sort_order int not null default 0,
  category text not null default 'admin' check (category in ('event','content','health','admin'))
);

create table if not exists days (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  one_thing_goal_id uuid references goals(id),
  mood text check (mood in ('low','ok','high')),
  post_done boolean not null default false,
  log_done boolean not null default false,
  two_min_used boolean not null default false,
  one_thing_done boolean not null default false,
  hook text -- the day's yap hook: first line of the reel, becomes the morning push title
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  shipped text not null default '',
  signal text not null default '',
  tomorrow text not null default ''
);

create table if not exists streak (
  id int primary key default 1,
  current_count int not null default 0,
  last_complete_date date
);

create table if not exists push_subs (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  keys_p256dh text not null,
  keys_auth text not null
);

create table if not exists settings (
  id int primary key default 1,
  morning_time text not null default '07:30',
  night_time text not null default '22:30',
  timezone text not null default 'Asia/Kolkata',
  in_bangalore boolean not null default false,
  morning_stack text not null default '' -- free text riding the morning push body: "meds, B12, juice"
);

-- one row per push actually sent, so the tick cron never double-sends
create table if not exists push_log (
  kind text not null,
  date date not null,
  primary key (kind, date)
);

-- Medications / peptides: adherence tracking only. Names + days, never doses.
create table if not exists meds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  days int[] not null default '{}', -- 0=Sunday .. 6=Saturday
  sort_order int not null default 0,
  active boolean not null default true
);

create table if not exists med_takes (
  id uuid primary key default gen_random_uuid(),
  med_id uuid not null references meds(id) on delete cascade,
  date date not null,
  unique (med_id, date)
);

-- The big three. Fixed, not tasks. The WHY behind the daily grind.
create table if not exists north_stars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  translation text not null, -- the daily "so": lose weight / make content
  target_date date,
  sort_order int not null default 0
);

insert into streak (id) values (1) on conflict do nothing;
insert into settings (id) values (1) on conflict do nothing;

alter table goals enable row level security;
alter table meds enable row level security;
alter table med_takes enable row level security;
alter table north_stars enable row level security;
alter table days enable row level security;
alter table logs enable row level security;
alter table streak enable row level security;
alter table push_subs enable row level security;
alter table settings enable row level security;
alter table push_log enable row level security;
