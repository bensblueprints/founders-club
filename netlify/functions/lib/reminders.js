// Pure decision logic for the payment-reminder scheduler — no I/O, so it is unit-testable.

const REMINDER_DAYS = [2, 5]; // gentle nudges
const EXPIRE_DAY = 7;         // final "seat released" + expire

// Whole days elapsed since acceptance.
function daysSince(acceptedAt, now = new Date()) {
    const accepted = new Date(acceptedAt).getTime();
    if (!accepted || Number.isNaN(accepted)) return null;
    return Math.floor((now.getTime() - accepted) / (24 * 60 * 60 * 1000));
}

// Given an application row, decide what (if anything) to do this run.
// Returns one of:
//   { action: 'none' }
//   { action: 'remind', day, daysLeft, addReminder }
//   { action: 'expire', day, addReminder }
// `sent` is the reminders_sent array (day-numbers already actioned).
function decide(app, now = new Date()) {
    // Only approved + unpaid seats are in scope.
    if (app.status !== 'approved') return { action: 'none' };
    if (app.payment_status === 'paid') return { action: 'none' };
    if (!app.accepted_at) return { action: 'none' };

    const days = daysSince(app.accepted_at, now);
    if (days === null) return { action: 'none' };

    const sent = Array.isArray(app.reminders_sent) ? app.reminders_sent.map(Number) : [];

    // Expiry takes priority once we hit day 7+.
    if (days >= EXPIRE_DAY) {
        if (sent.includes(EXPIRE_DAY)) return { action: 'none' };
        return { action: 'expire', day: EXPIRE_DAY, addReminder: EXPIRE_DAY };
    }

    // Otherwise, fire the highest due reminder day not yet sent (send at most one per run).
    const due = REMINDER_DAYS.filter(d => days >= d && !sent.includes(d));
    if (due.length === 0) return { action: 'none' };
    const day = Math.max(...due);
    return { action: 'remind', day, daysLeft: EXPIRE_DAY - days, addReminder: day };
}

module.exports = { REMINDER_DAYS, EXPIRE_DAY, daysSince, decide };
