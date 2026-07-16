// Runs every 15 minutes: one reminder at 24h, one final reminder when 6h remain;
// expiry, account lock, seat release, and Airwallex deactivation at 48h.

const { sql, isConfigured } = require('./lib/neon');
const { deactivatePaymentLink } = require('./lib/airwallex');
const { sendEmail, reminderEmail, expiredEmail } = require('./lib/emailer');
const { decide } = require('./lib/reminders');

exports.handler = async () => {
    if (!isConfigured()) return { statusCode: 200, body: 'skipped: not configured' };

    const orders = await sql`
        SELECT po.*, a.first_name, a.email, a.payment_link,
               e.name AS event_name, e.event_date, e.event_time, e.location AS event_location
        FROM payment_orders po
        JOIN applications a ON a.id = po.application_id
        JOIN events e ON e.id = po.event_id
        WHERE po.status = 'pending'
        ORDER BY po.expires_at ASC`;

    let reminded = 0;
    let expired = 0;
    let failed = 0;
    const now = new Date();

    for (const order of orders) {
        const decision = decide(order, now);
        if (decision.action === 'none') continue;
        const eventDetails = {
            name: order.event_name,
            date: new Date(order.event_date).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
            }),
            location: order.event_location,
            time: order.event_time,
            price: `${order.ticket_count} ticket${Number(order.ticket_count) === 1 ? '' : 's'}`
        };

        if (decision.action === 'remind_initial' || decision.action === 'remind_final') {
            const tmpl = reminderEmail({
                firstName: order.first_name,
                paymentUrl: order.payment_link,
                hoursLeft: decision.hoursLeft,
                reminderKind: decision.action === 'remind_final' ? 'final' : 'initial',
                event: eventDetails
            });
            const sent = await sendEmail({ to: order.email, subject: tmpl.subject, html: tmpl.html, tracking: {
                type: decision.action === 'remind_final' ? 'payment_reminder_6h' : 'payment_reminder_24h',
                applicationId: order.application_id,
                memberId: order.member_id,
                eventId: order.event_id,
                metadata: { hoursLeft: decision.hoursLeft }
            } });
            if (sent.success) {
                if (decision.action === 'remind_final') {
                    await sql`UPDATE payment_orders SET final_reminder_sent_at = NOW(), updated_at = NOW() WHERE id = ${order.id} AND final_reminder_sent_at IS NULL`;
                } else {
                    await sql`UPDATE payment_orders SET reminder_sent_at = NOW(), updated_at = NOW() WHERE id = ${order.id} AND reminder_sent_at IS NULL`;
                }
                reminded++;
            } else failed++;
            continue;
        }

        // Deactivate first. If provider deactivation fails, keep the reservation
        // pending and retry next scheduler run instead of releasing a seat while
        // a live card link can still accept money.
        try {
            await deactivatePaymentLink(order.airwallex_link_id);
        } catch (error) {
            console.error('[payment-reminders] Airwallex deactivation failed for order', order.id, error.message);
            failed++;
            continue;
        }

        const rows = await sql`
            WITH expired_order AS (
                UPDATE payment_orders SET status = 'expired', updated_at = NOW()
                WHERE id = ${order.id} AND status = 'pending' AND expires_at <= NOW()
                RETURNING *
            ), expired_application AS (
                UPDATE applications a SET status = 'expired', payment_status = 'expired'
                FROM expired_order eo WHERE a.id = eo.application_id RETURNING a.id
            ), released_attendance AS (
                UPDATE event_attendance ea SET payment_status = 'expired'
                FROM expired_order eo WHERE ea.application_id = eo.application_id RETURNING ea.id
            ), locked_member AS (
                UPDATE members m SET account_status = 'locked', payment_access_expires_at = NULL, updated_at = NOW()
                FROM expired_order eo
                WHERE m.id = eo.member_id
                  AND eo.account_was_existing = false
                  AND NOT EXISTS (
                      SELECT 1 FROM event_attendance paid
                      WHERE paid.member_id = m.id AND paid.payment_status = 'paid'
                  )
                RETURNING m.id
            )
            SELECT id FROM expired_order`;

        if (!rows[0]) continue;
        const tmpl = expiredEmail({
            firstName: order.first_name,
            existingAccount: order.account_was_existing === true,
            event: eventDetails
        });
        const sent = await sendEmail({ to: order.email, subject: tmpl.subject, html: tmpl.html, tracking: {
            type: 'reservation_expired', applicationId: order.application_id,
            memberId: order.member_id, eventId: order.event_id
        } });
        if (!sent.success) failed++;
        expired++;
    }

    const summary = `reminded=${reminded} expired=${expired} failed=${failed} total=${orders.length}`;
    console.log('[payment-reminders]', summary);
    return { statusCode: failed ? 500 : 200, body: summary };
};

exports.config = { schedule: '*/15 * * * *' };
