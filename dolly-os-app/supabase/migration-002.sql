-- Migration 002: yap hook + morning stack + push dedupe log.
-- Only needed if you already ran an earlier schema.sql; fresh installs get
-- all of this from schema.sql directly.

alter table days add column if not exists hook text;
alter table settings add column if not exists morning_stack text not null default '';

create table if not exists push_log (
  kind text not null,
  date date not null,
  primary key (kind, date)
);
alter table push_log enable row level security;
