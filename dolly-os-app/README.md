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
- **Log** (`/log`) — shipped · one signal · tomorrow's ONE thing. Submitting
  sets tomorrow's task automatically — the evening log IS tomorrow's planning.
- **Meds** (`/meds`) — weekly adherence checklist. Add your own meds (name +
  days of week) in the app; nothing is hardcoded. Missed days are neutral grey.
  Meds due today ride along in the morning push. Tracks ticks only — schedules
  and doses are the doctors' job.
- **Settings** (`/settings`) — enable notifications, Bangalore toggle
  (gym vs 10-min), timezone, ping-time reference.

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
automatically). The three crons in `vercel.json` are set for IST defaults:
morning 07:30, night 22:30, phone-out 23:00. To change a time, edit the UTC
cron expressions there and redeploy.

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
- Meds + north stars + the Call are additions requested after the spec.
- The meds reminder is folded into the morning push instead of a 4th
  notification (spec rule: never more than 3×/day).
- Not built, per the spec: time blocking, pomodoro, habit chains, analytics,
  trend charts.
