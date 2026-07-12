-- ============================================================
-- FoundersVN — application → payment flow migration
-- Run this in the Supabase SQL editor. Safe to run multiple times (idempotent).
-- ============================================================

-- New columns captured by the landing "Apply" form + the payment lifecycle.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS company_link    TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS looking_for     TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS can_offer       TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS what_you_do     TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS page_language   VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS event           TEXT;

-- Payment / lifecycle columns.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_status  VARCHAR(20);      -- awaiting | paid | expired
ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_link    TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS accepted_at     TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reminders_sent  INTEGER[] DEFAULT '{}';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS paid_at         TIMESTAMP WITH TIME ZONE;

-- The `industry` chip field can be a comma-joined list longer than the original VARCHAR(50).
-- Widen it so inserts never truncate/fail. (No-op if already TEXT.)
ALTER TABLE applications ALTER COLUMN industry TYPE TEXT;

-- The landing form no longer collects age; relax the (nullable already) columns are fine.
-- Default reminders_sent for any pre-existing rows.
UPDATE applications SET reminders_sent = '{}' WHERE reminders_sent IS NULL;

-- 'expired' is a new status value used by the reminder scheduler (status is a free VARCHAR, no enum to alter).

-- Helpful index for the reminder scheduler's query (approved + unpaid).
CREATE INDEX IF NOT EXISTS idx_applications_payment_status ON applications(payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_status_payment ON applications(status, payment_status);
