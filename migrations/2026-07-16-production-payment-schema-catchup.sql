-- Production catch-up for the hosted checkout/payment environment rollout.
-- This records the exact schema pieces that were required on the live Neon DB
-- after Airwallex Hosted Payment Page was enabled. It is intentionally
-- idempotent, so it is safe to run on fresh/local databases as well.

ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS provider_environment TEXT DEFAULT 'sandbox';

UPDATE payment_orders
SET provider_environment = CASE
    WHEN airwallex_link_id LIKE 'mock-link-%' THEN 'mock'
    ELSE 'sandbox'
END
WHERE provider_environment IS NULL;

ALTER TABLE payment_orders ALTER COLUMN provider_environment SET NOT NULL;

ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS airwallex_intent_id TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS airwallex_client_secret_encrypted TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS airwallex_intent_created_at TIMESTAMPTZ;

ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_provider_environment_check;
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_provider_environment_check
    CHECK (provider_environment IN ('mock', 'sandbox', 'production'));

CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_environment
    ON payment_orders(provider_environment, status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_airwallex_intent
    ON payment_orders(airwallex_intent_id);
