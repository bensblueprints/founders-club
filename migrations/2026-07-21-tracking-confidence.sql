ALTER TABLE members
    ADD COLUMN IF NOT EXISTS login_tracking_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE email_deliveries
    ADD COLUMN IF NOT EXISTS engagement_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_email_webhook_events_provider_type
    ON email_webhook_events(provider_email_id, event_type, received_at DESC);
