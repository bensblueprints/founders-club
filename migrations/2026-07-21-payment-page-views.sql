ALTER TABLE payment_orders
    ADD COLUMN IF NOT EXISTS payment_page_first_viewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_page_last_viewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_page_view_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payment_orders_page_viewed
    ON payment_orders(payment_page_first_viewed_at DESC)
    WHERE payment_page_first_viewed_at IS NOT NULL;
