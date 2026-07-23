# FoundersVN — Application → Payment Backend

End-to-end flow: apply for a specific event → organiser reviews → admin accepts →
member account + temporary credentials are created → seats are held for 48 hours →
the applicant chooses Airwallex card (+5%) or fee-free SePay QR → a verified webhook
marks the registration paid → meal selection and the paid attendee directory unlock.

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
| Admin approval + atomic capacity reservation | `netlify/functions/accept-application.js` |
| 24-hour reminder / 48-hour expiry scheduler | `netlify/functions/payment-reminders.js` |
| Airwallex webhook | `netlify/functions/airwallex-webhook.js` |
| SePay HMAC webhook | `netlify/functions/sepay-webhook.js` |
| Shared idempotent payment completion | `netlify/functions/lib/complete-payment.js` |
| AES-256-GCM field encryption | `netlify/functions/lib/field-crypto.js` |
| Shared Airwallex helper | `netlify/functions/lib/airwallex.js` |
| Shared Neon Postgres client | `netlify/functions/lib/neon.js` |
| Shared Resend email helper + templates | `netlify/functions/lib/emailer.js` |
| Pure reminder day-math (unit-tested) | `netlify/functions/lib/reminders.js` |
| Neon schema (run once) | `db/neon-schema.sql` |
| Event-registration migration | `migrations/2026-07-13-event-registration-directory.sql` |
| Reservation/payment migration | `migrations/2026-07-14-reservation-payments.sql` |
| Neon setup / go-live guide | `db/README-NEON.md` |

**Data layer: Neon Postgres, server-side only.** The browser never touches the
database. `database.js` calls the consolidated `/.netlify/functions/db-api`
function, which runs parameterized SQL against Neon (`DATABASE_URL`). Supabase has
been fully removed (no `@supabase/supabase-js`, no anon key in the browser).

The Next.js landing form POSTs to `/api/function/submit-application`.

The admin page loads applications via `db-api` (`applications.list`, admin-JWT gated)
and exposes **"Approve & hold 48h"** for pending applications.

## 1. Create the Neon DB + run the schema (once)

See **`db/README-NEON.md`** for the full walkthrough: create a Neon project, copy the
pooled connection string into `DATABASE_URL`, then paste and run `db/neon-schema.sql`
in the Neon SQL editor. It's idempotent (`IF NOT EXISTS`).

For an existing database, run both migrations in order. The first links applications
to `events.id`, permits one application per email per event, and extends
`event_attendance`; the second adds payment orders, dual-provider references,
seat quantities, account locks, audit events, and meal selections. `npm run db:migrate`
applies them idempotently.

## Local database development

Development uses local Postgres; deployed functions continue to use Neon:

```bash
npm run stack:dev
```

`stack:dev` loads `.env.local`, starts Docker Postgres, applies the schema and
migrations, seeds the admin/sample accounts, then starts Next.js. The local
admin account is:

```txt
admin@advancedmarketing.co
LocalAdmin123!
```

For automated verification, run the full local test stack:

```bash
npm run stack:test
```

Useful stack commands:

| Command | What it does |
|---|---|
| `npm run stack:setup` | Start Postgres, migrate, and seed from `.env.local`. |
| `npm run stack:dev` | Setup plus Next.js on `http://localhost:3000`. |
| `npm run stack:test` | Setup from `.env.test`, then unit + integration tests. |
| `npm run stack:integration` | Setup from `.env.test`, then only the DB flow test. |
| `npm run stack:down` | Stop the Docker Postgres stack. |

The DB adapter selects `pg` for localhost and the Neon serverless driver for the
deployed Neon URL. Local development uses provider sandboxes; only `.env.test`
uses mock settlement.

## 2. Set these environment variables in Netlify

Site → Settings → Environment variables:

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | **all DB access** | Neon → your project → Connection string (use the **pooled** `-pooler` string). This is the only DB credential now. |
| `RESEND_API_KEY` | sending email | From resend.com. Without it, emails are logged, not sent (flow still works). |
| `RESEND_WEBHOOK_SECRET` | delivery tracking | Signing secret for the Resend webhook endpoint `/api/function/resend-webhook`. |
| `RESEND_WEBHOOK_URL` | local webhook testing | Set automatically by `npm run stack:dev:public`; paste this URL into the Resend dashboard while the tunnel is running. |
| `FROM_EMAIL` | sending email | e.g. `Founders Vietnam <support@foundersvn.com>` (verified domain). |
| `NOTIFY_EMAILS` | new-application alerts | Comma-separated. Defaults to `ben@advancedmarketing.co`. |
| `SESSION_SECRET` | **login / all sessions** | **REQUIRED for auth.** Any long random secret (e.g. `openssl rand -hex 32`). Signs the HS256 session JWTs. If unset, `auth-login` returns 500. |
| `ADMIN_TOKEN` | accept endpoint / db-api admin (fallback) | Any long random secret. Still accepted via the `x-admin-token` header for backward compat / server-to-server, but admins now authorize automatically with their JWT. |
| `PAYMENTS_ENV` | all payments | `sandbox` locally, `production` when live, `mock` only in automated tests. |
| `PAYMENT_PROVIDERS` | payment method availability | Comma-separated `airwallex,sepay`, or `sepay` while Airwallex is unavailable. Disabled providers are not called or displayed. |
| `AIRWALLEX_API_KEY` | payment links | API key from the current Airwallex sandbox or production account. |
| `AIRWALLEX_CLIENT_ID` | payment links | Required by Airwallex alongside the API key. |
| `AIRWALLEX_WEBHOOK_SECRET` | webhook verification | Secret from the webhook configuration; signature is HMAC-SHA256 over `x-timestamp + raw_body`. |
| `AIRWALLEX_WEBHOOK_URL` | local webhook testing | Set automatically by `npm run stack:dev:public`; paste this URL into the Airwallex dashboard while the tunnel is running. |
| `DATA_ENCRYPTION_KEY` | sensitive fields | Required in production. Generate with `openssl rand -base64 32`; Airwallex URLs are AES-256-GCM encrypted at the application layer. |
| `QUICK_RESERVATION_TEST_SECRET` | private 5,000 VND production test | Generate with `openssl rand -hex 32`. Used to sign short-lived test checkout links; never place the raw secret in a URL. |
| `SEPAY_BANK` | SePay QR | Current sandbox or production bank short code. |
| `SEPAY_ACCOUNT_NUMBER` | SePay QR/webhook | Receiving account; incoming webhooks must match it. |
| `SEPAY_USD_TO_VND_RATE` | SePay pricing | Fixed rate captured when the reservation is approved. Default `26000`; set this deliberately in production. |
| `SEPAY_WEBHOOK_SECRET` | SePay webhook | SePay HMAC uses `timestamp.raw_body` and rejects timestamps older than five minutes. |
| `SEPAY_WEBHOOK_URL` | local webhook testing | Set automatically by `npm run stack:dev:public`; paste this URL into the SePay dashboard while the tunnel is running. |
| `URL` | links in emails | Netlify sets this automatically to the site URL. |

## 3. Configure the Airwallex webhook

In the Airwallex dashboard add a webhook pointing to:

```
https://foundersvn.com/api/function/airwallex-webhook
```

Subscribe to `payment_intent.succeeded`.
Copy the signing secret into `AIRWALLEX_WEBHOOK_SECRET`. When a seat is paid the webhook
atomically marks the application and its `event_attendance` row paid. Only members
with a paid registration can browse other paid attendees of the same event.

## 4. Configure the Resend webhook

In the Resend dashboard add a webhook pointing to:

```
https://foundersvn.com/api/function/resend-webhook
```

For local testing, run `npm run stack:dev:public` and use the printed
`Resend webhook` URL instead. Subscribe to delivery status events such as
`email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`,
`email.failed`, and `email.complained`; `email.opened` and `email.clicked` are
also supported for the admin email tracker. Copy the Resend signing secret into
`RESEND_WEBHOOK_SECRET`.

Configure SePay to POST incoming transactions to:

```
https://foundersvn.com/api/function/sepay-webhook
```

Choose HMAC-SHA256 authentication, copy the same secret to `SEPAY_WEBHOOK_SECRET`,
and configure the `FVN` payment-code prefix. The handler validates signature,
five-minute replay window, account number, incoming direction, exact VND amount,
payment code, and SePay transaction ID deduplication.

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

`payment-reminders.js` runs every 15 minutes. For each pending payment order:

- **24 hours** after approval → send one payment reminder.
- **48 hours** after approval → deactivate the Airwallex link, expire the order,
  lock a newly-created unpaid account, release all reserved seats, and send the expiry email.

Paid orders are skipped. Provider event IDs are unique in `payment_events`, so
webhook retries are idempotent. SePay QR transfers cannot be revoked at the bank;
after expiry the server refuses to apply them to an expired reservation.

## Local logic tests

The pure day-math, dedup, field-mapping, and email templating were verified with a node
script. The `db-api` action router + SQL parameter binding are covered by
`tests/db-api.test.js`. Airwallex/Resend/Neon are never called with real credentials locally.
