# DOLLY OS — the app

Personal goal + accountability PWA, built from `../dolly-os/BUILD_SPEC.md`.
Single user. ADHD-first rules: one task on screen, the app decides, the floor
is sacred, no guilt UI, everything draggable.

## What's inside

- **Today** (`/`) — THE ONE THING + `posted`/`logged` floor checkboxes. Both
  checked → full-screen green "That's a complete day." Buttons: `bad day`
  (2-minute mode, preserves streak), `swap`, and **☎ the call**.
- **The Call** (`/talk`) — on-demand hard-hitting pep talk generated live by
  Claude from your real state (streak, unchecked goals, October flea countdown).
  Works without an API key too (built-in fallback talk).
- **Week** (`/week`) — drag-and-drop kanban: This Week · Doing · Done · Killed.
  Dragging into Killed is celebrated ("killed. good.").
- **Month** (`/month`) — 30-day grid (green/grey/white) + the **north-star
  strip**: October lil flea → lose weight (with countdown) · Content queen →
  lose weight · Fame + travel → make content. Tap a day to see its log.
- **Log** (`/log`) — shipped · one signal · tomorrow's ONE thing · tomorrow's
  **hook** (optional). Submitting sets tomorrow's task automatically — the
  evening log IS tomorrow's planning. The hook becomes tomorrow's morning
  notification title: you wake up to the first line of your own reel.
- **Meds** (`/meds`) — weekly adherence checklist. Add your own meds (name +
  days of week) in the app; nothing is hardcoded. Missed days are neutral grey.
  Meds due today ride along in the morning push. Tracks ticks only — schedules
  and doses are the doctors' job.
- **Settings** (`/settings`) — enable notifications, Bangalore toggle
  (gym vs 10-min), timezone, real ping times, and the **morning stack**
  (free text like "B12, juice, funmax" that rides inside the morning push —
  one notification carries the whole morning, never more than 3 pings/day).

## Setup (~20 minutes, once)

### 1. Supabase
1. Open your Supabase project → SQL editor.
2. Run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Copy the project URL + `service_role` key into `.env` (see `.env.example`).

### 2. Push keys
```bash
npx web-push generate-vapid-keys
```
Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, private in
`VAPID_PRIVATE_KEY`.

### 3. Deploy to Vercel
```bash
npm i -g vercel   # if needed
vercel
```
Add all env vars from `.env.example` in the Vercel dashboard (including
`CRON_SECRET` — any random string; Vercel sends it on cron requests
automatically).

### 3b. The scheduler (how pushes actually fire)

Everything goes through one endpoint: `GET /api/cron/tick`. Each time it's
hit, it checks the times saved in Settings and sends whatever is due
(morning at your morning time, night at your night time, phone-out 30 min
after night). A `push_log` table guarantees each push sends at most once per
day, so overlapping schedulers are harmless.

- **Vercel Pro:** the cron in `vercel.json` (`*/10 * * * *`) is all you need.
- **Vercel Hobby (free):** Hobby crons only run ~once a day — not enough.
  Use [cron-job.org](https://cron-job.org) (free): create a job hitting
  `https://YOUR-APP.vercel.app/api/cron/tick` every 10 minutes, and add a
  request header `Authorization: Bearer YOUR_CRON_SECRET`. Two minutes of
  setup, done forever.

### 3c. Testing notifications (5 minutes, phone in hand)

1. Settings → set **morning ping** to ~5 minutes from now → lock the phone.
2. If it lands on the lock screen: done, set the time back.
3. If nothing arrives, likely causes in order:
   - **#1 iOS killer:** permission was granted from a Safari tab, not from
     the home-screen app. Delete the icon → re-add to home screen → open
     from the icon → Settings → enable notifications again → retest.
   - The scheduler isn't hitting `/api/cron/tick` (check cron-job.org run
     history / Vercel cron logs).
   - Instant manual test, bypasses the scheduler and the once-a-day guard:
     `curl -H "Authorization: Bearer $CRON_SECRET" "https://YOUR-APP.vercel.app/api/cron/morning?force=1"`
     (same for `/night` and `/phone`).

### 4. iPhone (this part is load-bearing)
1. Open the deployed URL in Safari → log in with your passphrase.
2. Share button → **Add to Home Screen**. Push does NOT work from Safari —
   only from the home-screen app. The app shows a banner about this too.
3. Open the app from the home screen → Settings → **enable notifications**.

## Local dev
```bash
npm install
cp .env.example .env   # fill it in
npm run dev
```

## Notes / deviations from the spec
- `days` table has one extra column vs the spec (`one_thing_done`) so the ONE
  THING card can show its done state independently of the goal row.
- Meds + north stars + the Call + the yap hook are additions requested after
  the spec.
- The meds reminder AND the custom morning stack are folded into the morning
  push instead of extra notifications (spec rule: never more than 3×/day —
  past 3, the brain marks the app as noise and swipes everything).
- Ping times live in Settings and are honored by `/api/cron/tick`, instead of
  hardcoded UTC cron expressions.
- Not built, per the spec: time blocking, pomodoro, habit chains, analytics,
  trend charts.
