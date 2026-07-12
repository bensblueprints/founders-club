// Scheduled function: runs daily at 14:00 UTC.
// For each approved + unpaid application it sends day-2 / day-5 reminders, and at day 7+
// expires the seat (status=expired, payment_status=expired) with a final "seat released" email.
// Dedup is tracked in the `reminders_sent` int[] column so no email double-fires.
//
// Netlify in-source schedule config (CommonJS): exports.config.schedule.

const { sql, isConfigured: dbConfigured } = require('./lib/neon');
const { sendEmail, reminderEmail, expiredEmail } = require('./lib/emailer');
const { decide } = require('./lib/reminders');

exports.handler = async () => {
    if (!dbConfigured()) {
        console.error('[payment-reminders] DATABASE_URL not set — skipping run.');
        return { statusCode: 200, body: 'skipped: not configured' };
    }
    const now = new Date();

    // Pull approved seats that aren't paid yet.
    let apps;
    try {
        apps = await sql`
            SELECT * FROM applications
            WHERE status = 'approved'
              AND (payment_status IS DISTINCT FROM 'paid')`;
    } catch (error) {
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

            try {
                await sql`UPDATE applications SET reminders_sent = ${newSent}::int[] WHERE id = ${app.id}`;
                reminded++;
            } catch (updErr) {
                console.error('[payment-reminders] update (remind) failed:', app.id, updErr);
            }

        } else if (d.action === 'expire') {
            const tmpl = expiredEmail({ firstName: app.first_name });
            await sendEmail({ to: app.email, subject: tmpl.subject, html: tmpl.html });

            try {
                await sql`
                    UPDATE applications SET
                        status = 'expired',
                        payment_status = 'expired',
                        reminders_sent = ${newSent}::int[]
                    WHERE id = ${app.id}`;
                expired++;
            } catch (updErr) {
                console.error('[payment-reminders] update (expire) failed:', app.id, updErr);
            }
        }
    }

    const summary = `reminded=${reminded} expired=${expired} skipped=${skipped} total=${(apps || []).length}`;
    console.log('[payment-reminders]', summary);
    return { statusCode: 200, body: summary };
};

// Netlify scheduled-function config (daily at 14:00 UTC).
exports.config = { schedule: '0 14 * * *' };
