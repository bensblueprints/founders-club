-- ============================================================
-- FOUNDERS VIETNAM — Neon Postgres schema
-- Run this once in the Neon SQL Editor (or via psql $DATABASE_URL).
-- Idempotent: safe to run multiple times (IF NOT EXISTS everywhere).
--
-- Ported from the old Supabase schema (database-schema.sql) with:
--   * uuid_generate_v4()  ->  gen_random_uuid()   (via pgcrypto, no uuid-ossp)
--   * Supabase auth.users / auth.uid() references removed. This app's login is
--     CLIENT-SIDE (auth.js, localStorage). Members live in the `members` table
--     but authentication is NOT handled by Postgres for now — the DB stores
--     profiles, not sessions/passwords for verification. See db/README-NEON.md.
--   * Row Level Security (RLS) policies dropped. Neon has no anon role and the
--     browser never connects directly — access control now lives in the
--     Netlify Function layer (db-api.js: public reads open, privileged writes
--     gated on the x-admin-token header).
--   * Payment/lifecycle columns from migrations/2026-07-application-payment-flow.sql
--     folded directly into the applications table.
--   * transactions + bookings tables (used by database.js but never defined in
--     the old schema) added here.
-- ============================================================

-- gen_random_uuid() lives in pgcrypto (Neon has it available).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================================
-- MEMBERS (user profiles; login is client-side)
-- ========================================
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),               -- nullable: auth is client-side for now
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    age INTEGER,
    company VARCHAR(255),
    role VARCHAR(100),
    industry VARCHAR(50),
    bio TEXT,
    website VARCHAR(500),
    websites JSONB DEFAULT '[]'::jsonb,        -- profile.html stores a websites array
    profile_photo TEXT,
    whatsapp VARCHAR(50),
    zalo VARCHAR(50),
    telegram VARCHAR(50),
    linkedin VARCHAR(500),
    twitter VARCHAR(100),
    wechat VARCHAR(100),
    facebook VARCHAR(500),
    instagram VARCHAR(100),
    social_link VARCHAR(500),
    is_approved BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    member_type TEXT DEFAULT 'member',
    must_reset_password BOOLEAN DEFAULT FALSE,
    account_status TEXT NOT NULL DEFAULT 'active',
    payment_access_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- APPLICATIONS (membership applications + payment lifecycle)
-- Columns from database-schema.sql + migrations/2026-07-application-payment-flow.sql
-- ========================================
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    event_id UUID,
    age INTEGER,
    social_link VARCHAR(500),
    company VARCHAR(255),
    role VARCHAR(100),
    industry TEXT,                            -- widened (comma-joined chip labels)
    revenue VARCHAR(50),
    team_size VARCHAR(50),
    biggest_challenge TEXT,
    unique_value TEXT,
    goals_12_month TEXT,
    why_join TEXT,
    referral VARCHAR(50),
    referrer_name VARCHAR(255),
    event_interest VARCHAR(50),
    membership_type VARCHAR(50),
    -- landing "Apply" form fields
    company_link TEXT,
    looking_for TEXT,
    can_offer TEXT,
    what_you_do TEXT,
    page_language VARCHAR(20),
    event TEXT,
    ticket_count SMALLINT NOT NULL DEFAULT 1,
    guest_name TEXT,
    -- lifecycle / payment
    status VARCHAR(20) DEFAULT 'pending',     -- pending, approved, rejected, disqualified, expired
    payment_status VARCHAR(20),               -- awaiting | paid | expired
    payment_link TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    reminders_sent INTEGER[] DEFAULT '{}',
    paid_at TIMESTAMP WITH TIME ZONE,
    approval_email_sent_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- EVENTS
-- ========================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME DEFAULT '18:00',
    day_of_week VARCHAR(20),
    location VARCHAR(255) DEFAULT 'Ho Chi Minh City',
    description TEXT,
    dinner_price DECIMAL(10,2) DEFAULT 150.00,
    cruise_price DECIMAL(10,2) DEFAULT 297.00,
    max_attendees INTEGER DEFAULT 100,
    max_cruise_spots INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'upcoming',    -- upcoming, open, closed, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- An email can apply to multiple events, but only once per event.
ALTER TABLE applications
    DROP CONSTRAINT IF EXISTS applications_email_key;
ALTER TABLE applications
    DROP CONSTRAINT IF EXISTS applications_event_id_fkey;
ALTER TABLE applications
    ADD CONSTRAINT applications_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS applications_event_email_unique
    ON applications(event_id, LOWER(email));

-- ========================================
-- EVENT ATTENDANCE
-- ========================================
CREATE TABLE IF NOT EXISTS event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    application_id UUID UNIQUE REFERENCES applications(id) ON DELETE SET NULL,
    ticket_type VARCHAR(20) NOT NULL,         -- 'dinner' or 'full'
    payment_status VARCHAR(20) DEFAULT 'pending',
    seat_count SMALLINT NOT NULL DEFAULT 1,
    meal_option TEXT,
    guest_name TEXT,
    guest_meal_option TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, member_id)
);

-- ========================================
-- EVENT PHOTOS
-- ========================================
CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    photo_url VARCHAR(1000) NOT NULL,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- SESSIONS (reserved for future server-side auth; unused while login is client-side)
-- ========================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PAYMENT ORDERS (one reservation, two payment methods)
-- ========================================
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
    airwallex_intent_id TEXT,
    airwallex_client_secret_encrypted TEXT,
    airwallex_intent_created_at TIMESTAMP WITH TIME ZONE,
    provider_environment TEXT NOT NULL DEFAULT 'sandbox',
    paid_provider TEXT,
    paid_amount NUMERIC(14,2),
    paid_currency TEXT,
    provider_transaction_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    confirmation_email_sent_at TIMESTAMP WITH TIME ZONE,
    account_was_existing BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS email_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_email_id TEXT UNIQUE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    email_type TEXT NOT NULL DEFAULT 'transactional',
    status TEXT NOT NULL DEFAULT 'queued',
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    event_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_webhook_events (
    svix_id TEXT PRIMARY KEY,
    provider_email_id TEXT,
    event_type TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========================================
-- TRANSACTIONS (payment attempts/records)
-- id is client-generated text (e.g. 'txn-...'); event_id/user_id are free text
-- (may be a slug or a localStorage id), so no FK constraints on them.
-- ========================================
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    amount DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'attempted',   -- attempted, processing, completed, failed, refunded
    payment_intent_id VARCHAR(255),
    payment_method VARCHAR(50) DEFAULT 'card',
    product_id VARCHAR(255),
    product_name VARCHAR(255),
    event_id TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BOOKINGS (event seat bookings)
-- ========================================
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    event_id TEXT,
    ticket_type VARCHAR(50),
    ticket_name VARCHAR(255),
    ticket_price DECIMAL(10,2),
    transaction_id TEXT,
    payment_status VARCHAR(20) DEFAULT 'pending',
    booking_status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- SAMPLE EVENTS (same seed as the old schema)
-- ========================================
INSERT INTO events (slug, name, event_date, day_of_week, status, description) VALUES
    ('jan-2026', 'January Gathering', '2026-01-24', 'Saturday', 'completed', 'Our inaugural gathering brought together Vietnam''s most ambitious founders.'),
    ('feb-2026', 'February Gathering', '2026-02-10', 'Tuesday', 'open', 'Monthly gathering for founders.'),
    ('mar-2026', 'March Gathering', '2026-03-11', 'Wednesday', 'upcoming', 'Monthly gathering for founders.'),
    ('apr-2026', 'April Gathering', '2026-04-14', 'Tuesday', 'upcoming', 'Monthly gathering for founders.'),
    ('may-2026', 'May Gathering', '2026-05-13', 'Wednesday', 'upcoming', 'Monthly gathering for founders.'),
    ('jun-2026', 'June Gathering', '2026-06-09', 'Tuesday', 'upcoming', 'Monthly gathering for founders.'),
    ('jul-2026', 'July Gathering', '2026-07-08', 'Wednesday', 'upcoming', 'Monthly gathering for founders.'),
    ('danang-jul-2026', 'FoundersVN Da Nang', '2026-07-31', 'Friday', 'open', 'Curated FoundersVN networking dinner at 4U Lounge.'),
    ('hcmc-aug-2026', 'FoundersVN Ho Chi Minh City', '2026-08-15', 'Saturday', 'open', 'FoundersVN networking event in Ho Chi Minh City.')
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_approved ON members(is_approved);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_payment_status ON applications(payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_status_payment ON applications(status, payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_event ON applications(event_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON event_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_paid_event ON event_attendance(event_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_member ON payment_orders(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_event_status ON payment_orders(event_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_expiry ON payment_orders(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_photos_event ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_email ON transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(user_email);
CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id);

-- ========================================
-- updated_at trigger for members
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
