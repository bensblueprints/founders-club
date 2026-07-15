-- Records which provider environment created each order. This prevents sandbox
-- and live webhook traffic from being treated as interchangeable during audits.
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS provider_environment TEXT;

UPDATE payment_orders
SET provider_environment = CASE
    WHEN airwallex_link_id LIKE 'mock-link-%' THEN 'mock'
    ELSE 'sandbox'
END
WHERE provider_environment IS NULL;

ALTER TABLE payment_orders ALTER COLUMN provider_environment SET NOT NULL;
ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_provider_environment_check;
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_provider_environment_check
    CHECK (provider_environment IN ('mock', 'sandbox', 'production'));

CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_environment
    ON payment_orders(provider_environment, status);
