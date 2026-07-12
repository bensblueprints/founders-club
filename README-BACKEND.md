# FoundersVN — Application → Payment Backend

End-to-end flow: apply → organiser notified → admin accepts → applicant gets a $150
Airwallex payment link → day 2/5 reminders → day 7 expire (seat released) → webhook marks paid.

## What was built

| Piece | File |
|---|---|
| Apply-form endpoint | `netlify/functions/submit-application.js` |
| Admin accept + payment link | `netlify/functions/accept-application.js` |
| Daily reminder / expiry scheduler | `netlify/functions/payment-reminders.js` |
| Payment webhook (mark paid) | `netlify/functions/airwallex-webhook.js` |
| Shared Airwallex helper | `netlify/functions/lib/airwallex.js` |
| Shared Supabase (service-role) client | `netlify/functions/lib/supabase.js` |
| Shared Resend email helper + templates | `netlify/functions/lib/emailer.js` |
| Pure reminder day-math (unit-tested) | `netlify/functions/lib/reminders.js` |
| DB migration | `migrations/2026-07-application-payment-flow.sql` |

The apply form in **`index.html`** and **`landing.html`** now POSTs to
`/.netlify/functions/submit-application` (via `CONFIG.FORM_ENDPOINT`).

The admin panel (`admin.js`) now also loads applications from Supabase and shows an
**"Accept & send payment email"** button on pending ones.

## 1. Run the SQL migration (once)

Open Supabase → SQL editor → paste and run
`migrations/2026-07-application-payment-flow.sql`. It's idempotent (`IF NOT EXISTS`).

## 2. Set these environment variables in Netlify

Site → Settings → Environment variables:

| Variable | Required for | Notes |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **all DB writes** | Supabase → Settings → API → `service_role` secret. Anon key is blocked by RLS for inserts/updates. |
| `SUPABASE_URL` | optional | Defaults to `https://afnikqescveajfempelv.supabase.co`. |
| `RESEND_API_KEY` | sending email | From resend.com. Without it, emails are logged, not sent (flow still works). |
| `FROM_EMAIL` | sending email | e.g. `Founders Vietnam <noreply@foundersvn.com>` (verified domain). |
| `NOTIFY_EMAILS` | new-application alerts | Comma-separated. Defaults to `ben@advancedmarketing.co`. |
| `ADMIN_TOKEN` | **accept endpoint auth** | Any long random secret. The admin UI prompts for it once and stores it in `localStorage`. |
| `AIRWALLEX_API_KEY` | payment links | From Airwallex. Without it, a MOCK link is returned. |
| `AIRWALLEX_CLIENT_ID` | payment links | From Airwallex. |
| `AIRWALLEX_ENV` | payment links | `production` for live; anything else uses the demo API. |
| `AIRWALLEX_WEBHOOK_SECRET` | webhook verification | From Airwallex webhook config. If unset, signature check is skipped (still functions). |
| `URL` | links in emails | Netlify sets this automatically to the site URL. |

## 3. Configure the Airwallex webhook

In the Airwallex dashboard add a webhook pointing to:

```
https://foundersvn.com/.netlify/functions/airwallex-webhook
```

Subscribe to payment success events (`payment_intent.succeeded` / `payment_link.paid`).
Copy the signing secret into `AIRWALLEX_WEBHOOK_SECRET`. When a seat is paid the webhook
sets `payment_status='paid'`, `paid_at=now`, and the reminder scheduler then skips it.

## Auth model (important)

`admin.js` authenticates **client-side only** (localStorage roles) — there is no
server-verifiable session. So `accept-application` is gated on a shared `ADMIN_TOKEN`
sent in the `x-admin-token` header. The admin UI prompts for it once and remembers it
in `localStorage` (`fvn_admin_token`); a 401 clears it so you can re-enter.

## Reminder schedule

`payment-reminders.js` runs daily at **14:00 UTC** (`exports.config.schedule = "0 14 * * *"`).
Each run, for every `approved` + unpaid application:

- **Day 2** and **Day 5** after `accepted_at` → send a reminder (once each).
- **Day 7+** → send "seat released" email, set `status='expired'`, `payment_status='expired'`.

Dedup is tracked in the `reminders_sent` INT[] column (holds the day-numbers already
actioned), so no email double-fires even if a run is missed. `payment_status='paid'`
rows are skipped entirely.

## Local logic tests

The pure day-math, dedup, field-mapping, and email templating were verified with a node
script (30 assertions passing). Airwallex/Resend/Supabase are never called locally.
