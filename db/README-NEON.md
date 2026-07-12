# FoundersVN — Neon Postgres setup

The site's data layer runs on **Neon Postgres**, accessed **only** server-side
through Netlify Functions. The browser never connects to the database — it calls
`/.netlify/functions/db-api`, which runs parameterized SQL against Neon.

Supabase has been fully removed. The only database credential is a single
connection string in the `DATABASE_URL` environment variable.

---

## Go-live checklist

### 1. Create a Neon project

1. Go to <https://console.neon.tech> and sign in.
2. **Create project** (choose a region close to the Netlify site's region, e.g. AWS
   `us-east` or `ap-southeast` for Vietnam traffic).
3. Neon creates a default database (usually `neondb`) and a role. That's fine.

### 2. Copy the connection string

1. In the project dashboard open **Connection Details**.
2. Choose the **Pooled connection** string (the host contains `-pooler`). The
   `@neondatabase/serverless` driver works best with the pooled endpoint for
   serverless functions.
3. It looks like:
   ```
   postgresql://<user>:<password>@ep-xxxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require
   ```

### 3. Set `DATABASE_URL` in Netlify

1. Netlify → your site → **Site configuration → Environment variables**.
2. Add:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the pooled connection string from step 2 |
3. Save. (You do NOT need `SUPABASE_*` anymore — remove them if present.)

> Keep the other backend env vars (`ADMIN_TOKEN`, `RESEND_API_KEY`, `FROM_EMAIL`,
> `NOTIFY_EMAILS`, `AIRWALLEX_*`) as documented in `README-BACKEND.md`.

### 4. Run the schema

1. Neon → **SQL Editor**.
2. Paste the entire contents of [`db/neon-schema.sql`](./neon-schema.sql) and run it.
   - It's idempotent (`CREATE ... IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) — safe to
     re-run.
   - It enables `pgcrypto` (for `gen_random_uuid()`), creates every table, seeds the
     sample events, and adds indexes + the `members.updated_at` trigger.

   Alternatively from a shell with `psql`:
   ```bash
   psql "$DATABASE_URL" -f db/neon-schema.sql
   ```

### 5. Deploy

Merge the `neon-migration` branch into `master`. Netlify auto-builds and the
functions pick up `DATABASE_URL`. The site is now live on Neon.

---

## Verifying it works

- **With `DATABASE_URL` set:** applications submitted on the landing page persist in
  the `applications` table; the admin panel (with the `ADMIN_TOKEN` entered) lists
  them; accepting one writes `status='approved'` + a payment link.
- **Without `DATABASE_URL`:** `db-api` returns HTTP 503 (`notConfigured`), and the
  browser (`database.js`) transparently falls back to `localStorage` — the UI still
  loads and works in a degraded/local mode, no uncaught errors.

## Auth model (unchanged, important)

Member **login stays client-side** (`auth.js` + `localStorage`); there is no
server-verifiable session. The `members` table stores profiles, not login
credentials for verification. Because of this:

- Privileged writes in `db-api` (creating events, adding event photos) and the
  administrative `applications.list` / `applications.get` reads are gated on the
  shared **`x-admin-token`** header (must equal `ADMIN_TOKEN`). `database.js`
  automatically attaches the token from `localStorage['fvn_admin_token']` when the
  admin has set it (the admin UI prompts once and stores it).
- All other reads (members, events, photos, transactions/bookings lookups) and the
  public `applications.create` (apply) are open, matching the pre-migration behavior.
- The `sessions` table exists in the schema but is currently unused — reserved for a
  future move to real server-side auth.
