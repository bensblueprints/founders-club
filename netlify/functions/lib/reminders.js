const REMINDER_AFTER_HOURS = 24;
const EXPIRE_AFTER_HOURS = 48;

function hoursSince(value, now = new Date()) {
    const start = new Date(value).getTime();
    if (!start || Number.isNaN(start)) return null;
    return Math.floor((now.getTime() - start) / (60 * 60 * 1000));
}

function decide(order, now = new Date()) {
    if (order.status !== 'pending') return { action: 'none' };
    if (new Date(order.expires_at).getTime() <= now.getTime()) return { action: 'expire' };
    const elapsed = hoursSince(order.created_at, now);
    if (elapsed === null) return { action: 'none' };
    if (elapsed >= REMINDER_AFTER_HOURS && !order.reminder_sent_at) {
        const hoursLeft = Math.max(1, Math.ceil((new Date(order.expires_at).getTime() - now.getTime()) / 3600000));
        return { action: 'remind', hoursLeft };
    }
    return { action: 'none' };
}

module.exports = { REMINDER_AFTER_HOURS, EXPIRE_AFTER_HOURS, hoursSince, decide };
