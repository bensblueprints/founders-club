-- ============================================================
-- FoundersVN — server-side auth schema additions.
-- Run once in the Neon SQL editor (or psql $DATABASE_URL) AFTER neon-schema.sql.
-- Idempotent: safe to run multiple times.
--
-- Adds the columns real (server-verified) login needs to the existing `members`
-- table. The `sessions` table already exists in neon-schema.sql; we do NOT use
-- it — sessions are stateless signed JWTs (HS256, SESSION_SECRET). No server
-- session rows to store or expire.
-- ============================================================

-- password_hash already exists in neon-schema.sql as VARCHAR(255); keep it but
-- ensure it is present (widen to TEXT is a no-op if already VARCHAR — the ADD is
-- guarded by IF NOT EXISTS).
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- role already exists as the job-title column (VARCHAR(100), e.g. 'Founder').
-- ADD IF NOT EXISTS leaves the existing column untouched. Kept here only so the
-- script is self-contained on a fresh DB.
ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- is_admin already exists in neon-schema.sql; ensure present.
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- member_type drives the client's role display / gating (owner|admin|organiser|
-- platinum_founding|founding|member). Distinct from the job-title `role`.
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'member';

-- Force a password change on first login (used for seeded admins / accepted apps).
ALTER TABLE members ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false;

-- Fast admin lookups.
CREATE INDEX IF NOT EXISTS idx_members_is_admin ON members(is_admin);

-- Case-insensitive email lookups for login (emails are stored/queried lower-cased
-- by the app, but this guards against accidental mixed-case rows).
CREATE INDEX IF NOT EXISTS idx_members_email_lower ON members(LOWER(email));

-- ============================================================
-- MESSAGES — real member-to-member messaging (replaces the old
-- localStorage-only fake). Sender identity is taken from the verified JWT
-- server-side; the browser never supplies its own from_member id.
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_member UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    to_member   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    read        BOOLEAN DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_to   ON messages(to_member);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_member);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_member, to_member);
