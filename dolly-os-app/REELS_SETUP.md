# Reel machine — setup (one time, ~15 min)

How it runs:
1. **Script**: once a day the tick cron asks Claude for a new reel whenever fewer than 3 are in the pipe. It alternates the two pillars (AI building, productivity) and pulls from what you logged as shipped this week.
2. **Video**: the GitHub Action `reels` runs every hour. It voices the script, builds the 1080×1920 video and uploads it.
3. **Approve**: you get a push notification (and an email, if Resend is set up). Open **Reels** in Dolly OS, then **approve**, **redo** (with a note), **post now** or **kill**.
4. **Post**: an approved reel takes the next free slot (**Mon/Wed/Fri/Sun 7:30 PM IST**), and the tick cron publishes it to Instagram. Nothing posts without your tap.

## 1. Supabase
SQL editor → run `supabase/migration-003-reels.sql`.

## 2. Vercel env vars (Project → Settings → Environment Variables)
| Name | Where it comes from |
|---|---|
| `ANTHROPIC_API_KEY` | platform.claude.com → API Keys (pays from your $100/month credit) |
| `APP_URL` | your Dolly OS URL, e.g. `https://dolly-os.vercel.app` |
| `IG_USER_ID` | see step 4 |
| `IG_ACCESS_TOKEN` | see step 4 |
| `RESEND_API_KEY` | optional, resend.com → API Keys (backup email) |
| `GITHUB_DISPATCH_TOKEN` | optional, GitHub → Settings → Developer settings → Fine-grained token, repo `Documents`, permission *Actions: read & write*. It makes "new reel" and "redo" render right away instead of at the next hourly run. |

Redeploy after adding them.

## 3. GitHub secrets (repo → Settings → Secrets and variables → Actions)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `CRON_SECRET`. Use the same values as in Vercel.
To change the voice, add a repository **variable** named `REEL_VOICE` (default `en-IN-NeerjaNeural`; another option is `en-US-AvaNeural`).

> Scheduled GitHub Actions only run from the default branch, so merge this branch to `master`.

## 4. Instagram (Creator/Business account linked to a Facebook Page)
1. developers.facebook.com → **Create app** → use case **"Manage messaging & content on Instagram"** (or type *Business*), then add the **Instagram Graph API**.
2. **Graph API Explorer** → choose your app → add permissions `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management` → **Generate Access Token**.
3. Swap it for a long-lived token (lasts 60 days):
   `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN`
4. Get your IG user ID: in the Explorer, run `me/accounts?fields=instagram_business_account{id,username}` and copy `instagram_business_account.id`.
5. Put those into `IG_ACCESS_TOKEN` and `IG_USER_ID`.

## Avatar mode (once Higgsfield credits are back)
If a reel row has an `avatar_url` (a talking-head MP4 of your Soul twin speaking the script in your "Dolly" voice), the renderer uses that clip as the picture and sound and lays the captions over it. Until then, reels are faceless: bold text with a TTS voice.
