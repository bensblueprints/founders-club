const FIRST_REMINDER_AFTER_HOURS = 24;
const FINAL_REMINDER_BEFORE_HOURS = 6;
const EXPIRE_AFTER_HOURS = 48;

function hoursSince(value, now = new Date()) {
    const start = new Date(value).getTime();
    if (!start || Number.isNaN(start)) return null;
    return Math.floor((now.getTime() - start) / (60 * 60 * 1000));
}

function hoursUntil(value, now = new Date()) {
    const end = new Date(value).getTime();
    if (!end || Number.isNaN(end)) return null;
    return Math.ceil((end - now.getTime()) / (60 * 60 * 1000));
}

function decide(order, now = new Date()) {
    if (order.status !== 'pending') return { action: 'none' };
    if (new Date(order.expires_at).getTime() <= now.getTime()) return { action: 'expire' };

    const left = hoursUntil(order.expires_at, now);
    if (left !== null && left <= FINAL_REMINDER_BEFORE_HOURS && !order.final_reminder_sent_at) {
        return { action: 'remind_final', hoursLeft: Math.max(1, left) };
    }

    const elapsed = hoursSince(order.created_at, now);
    if (elapsed === null) return { action: 'none' };
    if (elapsed >= FIRST_REMINDER_AFTER_HOURS && !order.reminder_sent_at) {
        return { action: 'remind_initial', hoursLeft: Math.max(1, left || 24) };
    }
    return { action: 'none' };
}

module.exports = {
    REMINDER_AFTER_HOURS: FIRST_REMINDER_AFTER_HOURS,
    FIRST_REMINDER_AFTER_HOURS,
    FINAL_REMINDER_BEFORE_HOURS,
    EXPIRE_AFTER_HOURS,
    hoursSince,
    hoursUntil,
    decide
};
