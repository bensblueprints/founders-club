# FoundersVN — Application → Payment Backend

End-to-end flow: apply → organiser notified → admin accepts → applicant gets a $150
Airwallex payment link → day 2/5 reminders → day 7 expire (seat released) → webhook marks paid.

## What was built

| Piece | File |
|---|---|
| Consolidated data API (all browser DB access) | `netlify/functions/db-api.js` |
| Server-verified login (bcrypt + JWT) | `netlify/functions/auth-login.js` |
| Session check (verify JWT, return user) | `netlify/functions/auth-me.js` |
| Logout (clear session cookie) | `netlify/functions/auth-logout.js` |
| Shared auth helpers (hash / JWT / gating) | `netlify/functions/lib/auth.js` |
| Auth schema additions + messages table | `db/auth-schema.sql` |
| Admin/sample account seeder | `db/seed-admins.js` |
| Auth go-live guide | `db/README-AUTH.md` |
| Apply-form endpoint | `netlify/functions/submit-application.js` |
| Admin accept + payment link | `netlify/functions/accept-application.js` |
| Daily reminder / expiry scheduler | `netlify/functions/payment-reminders.js` |
| Payment webhook (mark paid) | `netlify/functions/airwallex-webhook.js` |
| Shared Airwallex helper | `netlify/functions/lib/airwallex.js` |
| Shared Neon Postgres client | `netlify/functions/lib/neon.js` |
| Shared Resend email helper + templates | `netlify/functions/lib/emailer.js` |
| Pure reminder day-math (unit-tested) | `netlify/functions/lib/reminders.js` |
| Neon schema (run once) | `db/neon-schema.sql` |
| Neon setup / go-live guide | `db/README-NEON.md` |

**Data layer: Neon Postgres, server-side only.** The browser never touches the
database. `database.js` calls the consolidated `/.netlify/functions/db-api`
function, which runs parameterized SQL against Neon (`DATABASE_URL`). Supabase has
been fully removed (no `@supabase/supabase-js`, no anon key in the browser).

The apply form in **`index.html`** and **`landing.html`** POSTs to
`/.netlify/functions/submit-application` (via `CONFIG.FORM_ENDPOINT`).

The admin panel (`admin.js`) loads applications via `db-api` (`applications.list`,
admin-token gated) and shows an **"Accept & send payment email"** button on pending ones.

## 1. Create the Neon DB + run the schema (once)

See **`db/README-NEON.md`** for the full walkthrough: create a Neon project, copy the
pooled connection string into `DATABASE_URL`, then paste and run `db/neon-schema.sql`
in the Neon SQL editor. It's idempotent (`IF NOT EXISTS`).

## 2. Set these environment variables in Netlify

Site → Settings → Environment variables:

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | **all DB access** | Neon → your project → Connection string (use the **pooled** `-pooler` string). This is the only DB credential now. |
| `RESEND_API_KEY` | sending email | From resend.com. Without it, emails are logged, not sent (flow still works). |
| `FROM_EMAIL` | sending email | e.g. `Founders Vietnam <noreply@foundersvn.com>` (verified domain). |
| `NOTIFY_EMAILS` | new-application alerts | Comma-separated. Defaults to `ben@advancedmarketing.co`. |
| `SESSION_SECRET` | **login / all sessions** | **REQUIRED for auth.** Any long random secret (e.g. `openssl rand -hex 32`). Signs the HS256 session JWTs. If unset, `auth-login` returns 500. |
| `ADMIN_TOKEN` | accept endpoint / db-api admin (fallback) | Any long random secret. Still accepted via the `x-admin-token` header for backward compat / server-to-server, but admins now authorize automatically with their JWT. |
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

## Auth model (important) — server-verified login

**Hardcoded users and plaintext passwords have been REMOVED** from `auth.js`.
Login is now server-verified against Neon:

1. `login.html` → `Auth.signIn(email, password)` → POST `/.netlify/functions/auth-login`.
2. `auth-login` looks up the member by (lower-cased) email, verifies the password
   against `members.password_hash` with **bcrypt** (`bcryptjs`), and — on success —
   issues a **stateless HS256 JWT** signed with `SESSION_SECRET`
   (payload `{ sub: memberId, email, role, is_admin, iat, exp(~7d) }`), plus a
   hash-free public user object. Failure returns a generic
   `Invalid email or password` (no account enumeration).
3. The browser stores the JWT in `localStorage.fvn_session` and the user in
   `localStorage.fvn_user`. `database.js` attaches `Authorization: Bearer <jwt>` to
   every `db-api` call. An HttpOnly `fvn_session` cookie is also set for `auth-me`.
4. `Auth.getCurrentUser()` / `isLoggedIn()` read the cached user + check JWT expiry
   (sync). `Auth.isAdmin()` reads `is_admin`. `auth-me` re-validates against Neon on
   admin page load. `auth-logout` clears the cookie.

**Admin gating (db-api + accept-application):** a request is authorized for
admin-gated actions if it presents **EITHER** a valid JWT with `is_admin === true`
**OR** the shared `ADMIN_TOKEN` via `x-admin-token` (kept for backward compat /
server-to-server). Admins no longer need to type the token — their JWT authorizes them.

**Messaging (real, server-backed):** `messages.send/thread/inbox/unreadCount/markRead`
in `db-api` require a valid **member** JWT; the sender id is taken from the token
(`sub`), never from the request body, so a client cannot spoof `from`.

Sessions are stateless — the `sessions` table is unused (no server rows to expire).

### Seeding admins

Apply `db/neon-schema.sql` then `db/auth-schema.sql`, then run the seeder with the
DB URL (optionally pre-set passwords via `SEED_PW_BEN` / `SEED_PW_DAVID` /
`SEED_PW_SAUREBH` / `SEED_PW_PRATHAM`, else random ones are generated + printed):

```
DATABASE_URL='postgres://...' node db/seed-admins.js
```

It upserts the 4 admins (`is_admin=true`) + 2 sample approved members, idempotent on
email, and prints the plaintext passwords ONCE (never the bcrypt hash). See
`db/README-AUTH.md`.

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
script. The `db-api` action router + SQL parameter binding are covered by
`tests/db-api.test.js`. Airwallex/Resend/Neon are never called with real credentials locally.
