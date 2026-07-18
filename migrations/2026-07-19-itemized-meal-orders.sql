-- Itemized restaurant preorder, including the event food credit and amount due.
-- The legacy meal_option columns remain readable for older registrations.

ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS meal_order JSONB;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS meal_subtotal_vnd BIGINT NOT NULL DEFAULT 0;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS meal_vat_vnd BIGINT NOT NULL DEFAULT 0;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS meal_service_vnd BIGINT NOT NULL DEFAULT 0;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS meal_total_vnd BIGINT NOT NULL DEFAULT 0;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS meal_credit_vnd BIGINT NOT NULL DEFAULT 750000;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS meal_amount_due_vnd BIGINT NOT NULL DEFAULT 0;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS meal_submitted_at TIMESTAMPTZ;
ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS meal_updated_at TIMESTAMPTZ;

ALTER TABLE event_attendance DROP CONSTRAINT IF EXISTS event_attendance_meal_amounts_check;
ALTER TABLE event_attendance ADD CONSTRAINT event_attendance_meal_amounts_check CHECK (
    meal_subtotal_vnd >= 0 AND meal_vat_vnd >= 0 AND meal_service_vnd >= 0
    AND meal_total_vnd >= 0 AND meal_credit_vnd >= 0 AND meal_amount_due_vnd >= 0
);

CREATE INDEX IF NOT EXISTS idx_event_attendance_meal_due
    ON event_attendance(event_id, meal_amount_due_vnd)
    WHERE meal_submitted_at IS NOT NULL;
