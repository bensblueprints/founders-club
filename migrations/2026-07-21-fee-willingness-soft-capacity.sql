ALTER TABLE applications ADD COLUMN IF NOT EXISTS fee_willingness BOOLEAN;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS fee_acknowledged_at TIMESTAMPTZ;

COMMENT ON COLUMN applications.fee_willingness IS
    'Whether an under-$100k applicant confirmed willingness to pay an entrance fee if approved.';

COMMENT ON COLUMN events.max_attendees IS
    'Planning threshold. Reservations may exceed this number and are reported as overflow.';
