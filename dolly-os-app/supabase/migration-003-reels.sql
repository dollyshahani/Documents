-- Migration 003: the reel machine.
-- Claude writes the script (Vercel cron) → GitHub Action renders the video →
-- she approves in /studio → the tick cron posts it to Instagram in the next slot.
-- Run once in the Supabase SQL editor.

create table if not exists reels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'scripted' check (status in (
    'scripted',    -- Claude wrote it, waiting for the renderer
    'rendering',   -- GitHub Action is building the video
    'review',      -- video ready, waiting for her tap
    'approved',    -- slotted, waiting for scheduled_at
    'publishing',  -- Instagram container created, processing
    'posted',
    'rejected',
    'regenerate',  -- she asked for a redo (feedback goes back to Claude)
    'failed'
  )),
  topic text not null default '',
  pillar text not null default '',        -- 'ai-building' | 'productivity'
  hook text not null default '',
  script jsonb not null default '{}',     -- { hook, beats: [{ say, screen }], cta }
  caption text not null default '',
  feedback text,                          -- her note when asking for a redo
  avatar_url text,                        -- optional talking-head clip (Higgsfield etc.); renderer uses it if present
  video_url text,
  scheduled_at timestamptz,
  ig_container_id text,
  ig_media_id text,
  posted_at timestamptz,
  error text
);

create index if not exists reels_status_idx on reels (status);
alter table reels enable row level security;

-- Public bucket: Instagram's API fetches the video by URL, so it must be public.
insert into storage.buckets (id, name, public)
values ('reels', 'reels', true)
on conflict (id) do nothing;
