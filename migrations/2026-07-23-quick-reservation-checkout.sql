-- Public quick checkout. The raw browser access token and temporary password
-- are never stored in plaintext.

ALTER TABLE payment_orders
    ADD COLUMN IF NOT EXISTS quick_checkout BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS quick_new_member BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS quick_access_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS quick_temp_password_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS quick_credentials_revealed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_quick_access_token
    ON payment_orders(quick_access_token_hash)
    WHERE quick_access_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orders_quick_pending
    ON payment_orders(event_id, status, expires_at)
    WHERE quick_checkout = TRUE;
