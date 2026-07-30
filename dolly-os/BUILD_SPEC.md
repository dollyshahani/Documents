# DOLLY OS — BUILD SPEC
Paste this whole file into Claude Code as the project brief.

## What this is
A personal goal + accountability app for one user (Dolly). Installed to iPhone home
screen as a PWA. Sends push notifications. Drag-and-drop planning. Built for an ADHD
brain that stalls on open-ended decisions.

## Stack (reuse what she already has)
- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + auth) — she already has a Supabase project
- Vercel hosting + Vercel Cron for scheduled pushes
- `web-push` (VAPID) for notifications
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop
- Single user. Auth = one magic-link email OR a hardcoded passphrase. Do NOT build multi-tenant.

## THE NON-NEGOTIABLE DESIGN RULES (ADHD-first)
1. **Today screen shows ONE task.** Everything else is behind a tab. No scrolling list of
   pending work on the landing screen — it triggers freeze.
2. **Never an empty state that asks a question.** If nothing is planned, the app picks the
   next unchecked item from the current week and displays it. The app decides, not her.
3. **Two-minute mode.** A permanent button: "bad day." Tapping it replaces today's task with
   the 2-minute version and marks the day complete if she does it. Streak preserved.
4. **The floor is sacred.** Daily minimum = 1 post + 3-line log. If both are done, the day
   renders as COMPLETE (big green state) even if the ONE THING wasn't touched.
5. **No guilt UI.** No red overdue badges, no "you missed 4 days." Missed days render neutral
   grey. Streak counter shows current streak only, never the broken one.
6. **Everything draggable.** Reordering is the only planning interaction. No forms with 8 fields.

## Data model (Supabase)
```sql
goals        (id, title, week_number, month, status: todo|doing|done|killed, sort_order, category: event|content|health|admin)
days         (id, date, one_thing_goal_id, mood: low|ok|high, post_done bool, log_done bool, two_min_used bool)
logs         (id, date, shipped text, signal text, tomorrow text)
streak       (id, current_count, last_complete_date)
push_subs    (id, endpoint, keys_p256dh, keys_auth)
settings     (id, morning_time, night_time, timezone, in_bangalore bool)
```

## Screens

### 1. TODAY (default route `/`)
- Big date + "Day N of streak" (flame or dot, keep it calm)
- **THE ONE THING** — single card, huge type, the task title. Tap = done.
- Below it, two small checkboxes: `posted` · `logged`
- When both floor items checked → the whole screen turns to the COMPLETE state with one
  line: "That's a complete day." Nothing else.
- Bottom: `bad day` button (two-minute mode) and `swap` (pulls a different unchecked goal)

### 2. WEEK (`/week`)
- Kanban board, 4 columns: **This Week · Doing · Done · Killed**
- dnd-kit drag between columns and to reorder within a column
- Dragging into "Killed" is celebrated, not penalised — killing is a feature (copy: "killed. good.")
- Each card: title + category colour dot

### 3. MONTH (`/month`)
- The 30-day grid. Each day = a square: green (complete) / grey (missed) / white (future)
- Tap a square → that day's log
- Top: the month's 5 goals with progress (event seats, streak count, etc.) — read-only, edited in WEEK

### 4. LOG (`/log`)
- Three inputs only: **shipped · one signal · tomorrow's one thing**
- Submitting sets tomorrow's ONE THING automatically (this is the key loop — the evening
  log IS tomorrow's planning; she never plans in the morning)

### 5. SETTINGS (`/settings`)
- morning ping time, night ping time, timezone, "I'm in Bangalore" toggle (switches the
  movement prompt from "10-min anything" to "gym")

## Notifications (the part that must actually work)
iOS requires the PWA be **added to the home screen** before push works — put a one-time
banner on first load explaining this, with instructions. Don't skip it; without it the
whole feature silently fails on iPhone.

Three scheduled pushes via Vercel Cron (`vercel.json` crons hitting `/api/cron/*`):
1. **Morning (default 07:30)** — title = the ONE THING for today, body = "Move first. Floor: 1 post + log."
   If yesterday's mood was `low`, send the 2-minute version instead.
2. **Night (22:30)** — "3 lines. What shipped, one signal, tomorrow's one thing." Deep-links to `/log`.
3. **23:00** — "Phone out of the room." No deep link. This one is just a nudge.

Push implementation: generate VAPID keys, store subscription in `push_subs` on permission
grant, send with `web-push` from the cron route. Keep payloads under 200 chars.

## Seed data
Seed `goals` from the August plan: week 1 = book metabolic consult, book ADHD assessment,
move to Bangalore, lock HSR venue, ₹499 payment link live, LinkedIn post #4, first gym
session. Weeks 2–4 = Yap Day, Reddit post, seats checks, Edit Day (3-or-dead), personal DMs,
Cherie Blair application, attendee WhatsApp group, host the event.

## Build order (do not reorder — ship something usable on day one)
1. Supabase schema + seed
2. TODAY screen + floor checkboxes + streak logic
3. LOG screen + the "log sets tomorrow's one thing" loop
4. PWA manifest + service worker + add-to-home-screen banner
5. Push: VAPID, subscription, one cron (morning only)
6. WEEK board with dnd-kit
7. MONTH grid
8. Remaining crons + settings

Steps 1–4 are a working app. Everything after is upgrade.

## Explicitly do NOT build
Time blocking. Pomodoro. Habit chains. Analytics dashboards. Anything with a 7-day trend
chart — she will audit it instead of using it. Notifications that fire more than 3×/day.
