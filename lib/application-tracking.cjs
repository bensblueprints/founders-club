function isPaid(app = {}) {
    return app.order_status === 'paid' || app.payment_status === 'paid';
}

function loginActivity(app = {}) {
    if (app.last_login_at || Number(app.login_count || 0) > 0) {
        return {
            state: 'tracked',
            label: app.last_login_at
                ? `Last login ${new Date(app.last_login_at).toLocaleString()}`
                : `${Number(app.login_count)} tracked login${Number(app.login_count) === 1 ? '' : 's'}`
        };
    }
    if (isPaid(app)) return { state: 'confirmed', label: 'Account activity confirmed by payment' };
    if (app.login_tracking_started_at) return { state: 'not-recorded', label: 'No login recorded since tracking began' };
    return { state: 'unavailable', label: 'Login tracking unavailable for this record' };
}

function emailClickActivity(app = {}) {
    if (app.email_clicked) return { state: 'tracked', label: 'Email payment link clicked' };
    if (isPaid(app)) return { state: 'not-relevant', label: 'Paid - email click no longer relevant' };
    if (app.email_tracking_available) return { state: 'not-recorded', label: 'No tracked email link click' };
    return { state: 'unavailable', label: 'Email click tracking unavailable for this email' };
}

module.exports = { isPaid, loginActivity, emailClickActivity };
