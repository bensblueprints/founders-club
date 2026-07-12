// Scheduled function: runs daily at 14:00 UTC.
// For each approved + unpaid application it sends day-2 / day-5 reminders, and at day 7+
// expires the seat (status=expired, payment_status=expired) with a final "seat released" email.
// Dedup is tracked in the `reminders_sent` int[] column so no email double-fires.
//
// Netlify in-source schedule config (CommonJS): exports.config.schedule.

const { getServiceClient, isConfigured: supaConfigured } = require('./lib/supabase');
const { sendEmail, reminderEmail, expiredEmail } = require('./lib/emailer');
const { decide } = require('./lib/reminders');

exports.handler = async () => {
    if (!supaConfigured()) {
        console.error('[payment-reminders] SUPABASE_SERVICE_ROLE_KEY not set — skipping run.');
        return { statusCode: 200, body: 'skipped: not configured' };
    }
    const supabase = getServiceClient();
    const now = new Date();

    // Pull approved seats that aren't paid yet.
    const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .eq('status', 'approved')
        .neq('payment_status', 'paid');

    if (error) {
        console.error('[payment-reminders] query error:', error);
        return { statusCode: 500, body: 'query error' };
    }

    let reminded = 0, expired = 0, skipped = 0;

    for (const app of apps || []) {
        const d = decide(app, now);
        if (d.action === 'none') { skipped++; continue; }

        const sent = Array.isArray(app.reminders_sent) ? app.reminders_sent.map(Number) : [];
        const newSent = sent.includes(d.addReminder) ? sent : [...sent, d.addReminder];

        if (d.action === 'remind') {
            const tmpl = reminderEmail({
                firstName: app.first_name,
                payLink: app.payment_link,
                dayNumber: d.day,
                daysLeft: d.daysLeft
            });
            await sendEmail({ to: app.email, subject: tmpl.subject, html: tmpl.html });

            const { error: updErr } = await supabase
                .from('applications')
                .update({ reminders_sent: newSent })
                .eq('id', app.id);
            if (updErr) console.error('[payment-reminders] update (remind) failed:', app.id, updErr);
            else reminded++;

        } else if (d.action === 'expire') {
            const tmpl = expiredEmail({ firstName: app.first_name });
            await sendEmail({ to: app.email, subject: tmpl.subject, html: tmpl.html });

            const { error: updErr } = await supabase
                .from('applications')
                .update({
                    status: 'expired',
                    payment_status: 'expired',
                    reminders_sent: newSent
                })
                .eq('id', app.id);
            if (updErr) console.error('[payment-reminders] update (expire) failed:', app.id, updErr);
            else expired++;
        }
    }

    const summary = `reminded=${reminded} expired=${expired} skipped=${skipped} total=${(apps || []).length}`;
    console.log('[payment-reminders]', summary);
    return { statusCode: 200, body: summary };
};

// Netlify scheduled-function config (daily at 14:00 UTC).
exports.config = { schedule: '0 14 * * *' };
