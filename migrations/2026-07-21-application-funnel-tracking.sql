ALTER TABLE members ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_members_last_login_at ON members(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_application_updated
    ON email_deliveries(application_id, updated_at DESC);
