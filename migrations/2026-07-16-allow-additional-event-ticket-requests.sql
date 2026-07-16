-- Allow an existing member to request one additional event ticket after they
-- already have a paid/pending ticket for the same event. The max-two rule is
-- enforced in register-event.js and accept-application.js so duplicate
-- applications can represent a second admin-review/payment flow.

DROP INDEX IF EXISTS applications_event_email_unique;

CREATE INDEX IF NOT EXISTS idx_applications_event_email_status
    ON applications(event_id, LOWER(email), status);
