-- FoundersVN 48-hour seat reservation, dual-payment, and meal-selection flow.
-- Idempotent and safe for both local Postgres and Neon.

ALTER TABLE applications ADD COLUMN IF NOT EXISTS ticket_count SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS approval_email_sent_at TIMESTAMPTZ;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_ticket_count_check;
ALTER TABLE applications ADD CONSTRAINT applications_ticket_count_check CHECK (ticket_count IN (1, 2));

ALTER TABLE members ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE members ADD COLUMN IF NOT EXISTS payment_access_expires_at TIMESTAMPTZ;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_account_status_check;
ALTER TABLE members ADD CONSTRAINT members_account_status_check
    CHECK (account_status IN ('payment_pending', 'active', 'locked'));

ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS seat_count SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS meal_option TEXT;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS guest_meal_option TEXT;
ALTER TABLE event_attendance DROP CONSTRAINT IF EXISTS event_attendance_seat_count_check;
ALTER TABLE event_attendance ADD CONSTRAINT event_attendance_seat_count_check CHECK (seat_count IN (1, 2));
ALTER TABLE event_attendance DROP CONSTRAINT IF EXISTS event_attendance_meal_option_check;
ALTER TABLE event_attendance ADD CONSTRAINT event_attendance_meal_option_check
    CHECK (meal_option IS NULL OR meal_option IN ('steak', 'shrimp', 'chicken', 'vegan'));
ALTER TABLE event_attendance DROP CONSTRAINT IF EXISTS event_attendance_guest_meal_option_check;
ALTER TABLE event_attendance ADD CONSTRAINT event_attendance_guest_meal_option_check
    CHECK (guest_meal_option IS NULL OR guest_meal_option IN ('steak', 'shrimp', 'chicken', 'vegan'));

CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'preparing',
    ticket_count SMALLINT NOT NULL DEFAULT 1,
    base_amount_usd NUMERIC(10,2) NOT NULL,
    airwallex_fee_usd NUMERIC(10,2) NOT NULL,
    airwallex_total_usd NUMERIC(10,2) NOT NULL,
    sepay_amount_vnd BIGINT NOT NULL,
    sepay_code TEXT NOT NULL UNIQUE,
    airwallex_link_id TEXT,
    airwallex_url_encrypted TEXT,
    provider_environment TEXT NOT NULL DEFAULT 'sandbox',
    paid_provider TEXT,
    paid_amount NUMERIC(14,2),
    paid_currency TEXT,
    provider_transaction_id TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    confirmation_email_sent_at TIMESTAMPTZ,
    account_was_existing BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_orders_status_check CHECK (status IN ('preparing', 'pending', 'paid', 'expired', 'cancelled')),
    CONSTRAINT payment_orders_provider_check CHECK (paid_provider IS NULL OR paid_provider IN ('airwallex', 'sepay')),
    CONSTRAINT payment_orders_provider_environment_check CHECK (provider_environment IN ('mock', 'sandbox', 'production')),
    CONSTRAINT payment_orders_ticket_count_check CHECK (ticket_count IN (1, 2))
);

CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    payment_order_id UUID REFERENCES payment_orders(id) ON DELETE SET NULL,
    event_type TEXT,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    UNIQUE(provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_member ON payment_orders(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_event_status ON payment_orders(event_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_expiry ON payment_orders(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events(payment_order_id);

-- Backfill existing records so old approved applications remain readable.
UPDATE members SET account_status = 'active' WHERE account_status IS NULL;
UPDATE event_attendance SET seat_count = 1 WHERE seat_count IS NULL;

-- Current published dinner editions are intentionally capped at 25 seats.
UPDATE events SET max_attendees = 25
WHERE slug IN ('danang-jul-2026', 'hcmc-aug-2026') AND max_attendees = 100;
