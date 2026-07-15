ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS airwallex_intent_id TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS airwallex_client_secret_encrypted TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS airwallex_intent_created_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_payment_orders_airwallex_intent ON payment_orders(airwallex_intent_id);
