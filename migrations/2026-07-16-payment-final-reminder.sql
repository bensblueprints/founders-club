-- Track the second payment reminder separately from the 24-hour reminder.
-- Scheduler sends this when roughly 6 hours remain in the 48-hour hold.

ALTER TABLE payment_orders
    ADD COLUMN IF NOT EXISTS final_reminder_sent_at TIMESTAMPTZ;
