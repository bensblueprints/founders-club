-- Event-scoped registration and paid-attendee directory.
-- Safe to run against an existing FoundersVN Neon database.

ALTER TABLE members ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'member';
ALTER TABLE members ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false;

INSERT INTO events (slug, name, event_date, day_of_week, location, status, description) VALUES
    ('danang-jul-2026', 'FoundersVN Da Nang', '2026-07-31', 'Friday', 'Da Nang', 'open', 'Curated FoundersVN networking dinner at FOR YOU SteakHouse.'),
    ('hcmc-aug-2026', 'FoundersVN Ho Chi Minh City', '2026-08-15', 'Saturday', 'Ho Chi Minh City', 'open', 'FoundersVN networking event in Ho Chi Minh City.')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    event_date = EXCLUDED.event_date,
    location = EXCLUDED.location;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS event_id UUID;

-- Preserve existing landing-form submissions by resolving their old free-text event field.
UPDATE applications a
SET event_id = e.id
FROM events e
WHERE a.event_id IS NULL
  AND (
      (e.slug = 'danang-jul-2026' AND COALESCE(a.event, a.event_interest, '') ILIKE '%Da Nang%')
      OR
      (e.slug = 'hcmc-aug-2026' AND COALESCE(a.event, a.event_interest, '') ILIKE '%Ho Chi Minh%')
  );

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_email_key;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_event_id_fkey;
ALTER TABLE applications
    ADD CONSTRAINT applications_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT;

-- This used to be unique, but members can now request one additional ticket
-- for the same event as a separate application/payment flow.
CREATE INDEX IF NOT EXISTS idx_applications_event_email_status
    ON applications(event_id, LOWER(email), status);
CREATE INDEX IF NOT EXISTS idx_applications_event ON applications(event_id);

ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS application_id UUID;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE event_attendance DROP CONSTRAINT IF EXISTS event_attendance_application_id_fkey;
ALTER TABLE event_attendance
    ADD CONSTRAINT event_attendance_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS event_attendance_application_unique
    ON event_attendance(application_id) WHERE application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_paid_event
    ON event_attendance(event_id, payment_status);

-- Materialize approved applications as event registrations. Payment remains the
-- gate for directory visibility; approval alone does not grant directory access.
INSERT INTO event_attendance
    (event_id, member_id, application_id, ticket_type, payment_status, approved_at, paid_at)
SELECT
    a.event_id,
    m.id,
    a.id,
    CASE WHEN a.membership_type = 'full' THEN 'full' ELSE 'dinner' END,
    CASE WHEN a.payment_status = 'paid' THEN 'paid' ELSE COALESCE(a.payment_status, 'awaiting') END,
    COALESCE(a.accepted_at, a.reviewed_at, NOW()),
    a.paid_at
FROM applications a
JOIN members m ON LOWER(m.email) = LOWER(a.email)
WHERE a.event_id IS NOT NULL
  AND a.status = 'approved'
ON CONFLICT (event_id, member_id) DO UPDATE SET
    application_id = EXCLUDED.application_id,
    payment_status = EXCLUDED.payment_status,
    approved_at = COALESCE(event_attendance.approved_at, EXCLUDED.approved_at),
    paid_at = COALESCE(event_attendance.paid_at, EXCLUDED.paid_at);
