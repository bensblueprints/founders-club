# FoundersVN — Auth Hardening go-live

This replaces the old **insecure client-side login** (hardcoded users + plaintext
passwords shipped in `auth.js`) with **server-verified login** backed by Neon:
bcrypt password hashes + stateless HS256 session JWTs.

## What changed

- `auth.js` no longer contains ANY users or passwords. `Auth.signIn()` POSTs to
  `/.netlify/functions/auth-login`, which verifies a bcrypt hash in Neon and returns
  a signed JWT.
- New functions: `auth-login`, `auth-me`, `auth-logout`, and shared helpers in
  `netlify/functions/lib/auth.js`.
- `db-api` + `accept-application` now accept an **admin JWT** (or the legacy
  `ADMIN_TOKEN` header) for admin-gated actions.
- Real member-to-member **messaging** (`messages` table + `db-api` message actions),
  member directory now loads from Neon (`members.list`).

## Go-live steps

### 1. Set the env var (REQUIRED)

In Netlify → Site → Settings → Environment variables:

```
SESSION_SECRET = <a long random secret, e.g. `openssl rand -hex 32`>
```

Without `SESSION_SECRET`, `auth-login` returns 500 and nobody can log in.
`DATABASE_URL` (Neon pooled string) must already be set from the Neon migration.
`ADMIN_TOKEN` stays as an optional backward-compat fallback.

### 2. Apply the schema (idempotent)

Run in the Neon SQL editor (or `psql $DATABASE_URL`), in order:

```
db/neon-schema.sql      # base schema (already applied from the Neon migration)
db/auth-schema.sql      # adds password_hash/is_admin/member_type/must_reset_password + messages table
```

`db/auth-schema.sql` is safe to run multiple times.

### 3. Seed the admin + sample accounts

```
DATABASE_URL='postgres://...pooler...' node db/seed-admins.js
```

Optionally pre-set passwords (otherwise strong random ones are generated + printed):

```
SEED_PW_BEN=... SEED_PW_DAVID=... SEED_PW_SAUREBH=... SEED_PW_PRATHAM=... \
  DATABASE_URL='postgres://...' node db/seed-admins.js
```

Seeds (idempotent upsert on email):

| Email | Role | is_admin |
|---|---|---|
| admin@advancedmarketing.co | owner | ✅ |
| david@advancedmarketing.co | admin | ✅ |
| saurebh@advancedmarketing.co | admin | ✅ |
| pratham@advancedmarketing.co | admin | ✅ |
| sample.minh@foundersvn.example | founding (approved) | — |
| sample.sarah@foundersvn.example | platinum_founding (approved) | — |

The script prints each plaintext password ONCE. Store them in a password manager and
have each admin change their password. The bcrypt **hash is never printed or logged**.

### 4. Verify

- Log in at `/login.html` with a seeded admin → lands on `/members.html`; the admin
  gets an Admin nav link and `/admin.html` loads (guard passes).
- Log in as a sample member → directory shows the other members; open a member and
  send a message; the recipient sees it in `/messages.html`.
- Logged out, `/admin.html` and `/messages.html` redirect to `/login.html`.

## Session / JWT design

- **Stateless HS256 JWT**, signed with `SESSION_SECRET` via `node:crypto` HMAC (no
  `jsonwebtoken` dependency). Payload: `{ sub: memberId, email, role, is_admin, iat, exp }`,
  `exp` ≈ 7 days.
- Stored client-side in `localStorage.fvn_session` (+ an HttpOnly `fvn_session` cookie
  set by `auth-login` for `auth-me`). `database.js` sends it as `Authorization: Bearer`.
- Verification (`lib/auth.verifyToken`) is constant-time on the signature and rejects
  expired / tampered / wrong-secret tokens. The `sessions` table is unused.

## Tests

```
npm test          # tests/auth.test.js + tests/db-api.test.js
```

Covers bcrypt round-trip, JWT sign/verify/expiry/tamper, generic-401 on bad login,
no-hash-in-response, and admin/member JWT gating (incl. sender-from-token for messages).
