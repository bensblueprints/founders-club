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
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_webhook_events (
    svix_id TEXT PRIMARY KEY,
    provider_email_id TEXT,
    event_type TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_event_member
    ON email_deliveries(event_id, member_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_provider
    ON email_deliveries(provider_email_id);
