// Logged-in member registration request. This is intentionally separate from
// the public application form, but enters the same admin approval/capacity flow.

const crypto = require('crypto');
const { sql, isConfigured } = require('./lib/neon');
const { getBearerToken, verifyToken } = require('./lib/auth');
const { sendEmail, notificationEmail } = require('./lib/emailer');
const { createPaymentCode } = require('./lib/sepay');
const { paymentEnvironment } = require('./lib/payment-environment');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (statusCode, value) => ({ statusCode, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(value) });
const HOLD_MS = 48 * 60 * 60 * 1000;

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!isConfigured()) return json(503, { error: 'Database not configured' });
    const claims = verifyToken(getBearerToken(event));
    if (!claims?.sub) return json(401, { error: 'Unauthorized' });

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { error: 'Invalid JSON' }); }
    const ticketCount = Number(body.ticketCount || 1);
    const guestName = String(body.guestName || '').trim();
    if (![1, 2].includes(ticketCount)) return json(400, { error: 'Ticket quantity must be 1 or 2.' });

    const rows = await sql`
        SELECT m.*, e.id AS event_id, e.slug AS event_slug, e.name AS event_name,
               e.dinner_price, e.max_attendees
        FROM members m CROSS JOIN events e
        WHERE m.id = ${claims.sub} AND e.slug = ${String(body.eventSlug || '')}
          AND e.status IN ('open', 'upcoming') LIMIT 1`;
    const member = rows[0];
    if (!member) return json(404, { error: 'Member or open event not found.' });
    if (member.account_status !== 'active') return json(403, { error: 'Complete your current payment before registering for another event.' });

    const existingOrderRows = await sql`
        SELECT COALESCE(SUM(ticket_count), 0)::int AS seats
        FROM payment_orders
        WHERE member_id = ${claims.sub}
          AND event_id = ${member.event_id}
          AND (status = 'paid' OR (status IN ('pending', 'preparing') AND expires_at > NOW()))`;
    const pendingApplicationRows = await sql`
        SELECT COALESCE(SUM(ticket_count), 0)::int AS seats
        FROM applications a
        WHERE a.event_id = ${member.event_id}
          AND LOWER(a.email) = LOWER(${member.email})
          AND a.status = 'pending'
          AND NOT EXISTS (SELECT 1 FROM payment_orders po WHERE po.application_id = a.id)`;
    const existingOrderTickets = Number(existingOrderRows[0]?.seats || 0);
    const existingTickets = existingOrderTickets + Number(pendingApplicationRows[0]?.seats || 0);
    const remainingTickets = Math.max(0, 2 - existingTickets);
    if (remainingTickets <= 0) return json(409, { error: 'You already have the maximum 2 tickets for this event.' });
    if (ticketCount > remainingTickets) {
        return json(409, { error: `You can request ${remainingTickets} more ticket${remainingTickets === 1 ? '' : 's'} for this event.` });
    }
    if ((ticketCount === 2 || existingTickets >= 1) && !guestName) {
        return json(400, { error: 'Enter your partner / co-founder name.' });
    }

    if (existingOrderTickets >= 1) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + HOLD_MS);
        const orderId = crypto.randomUUID();
        const sepayCode = createPaymentCode(orderId);
        const unitPrice = Number(member.dinner_price || 150);
        const baseAmountUsd = roundMoney(unitPrice * ticketCount);
        const airwallexFeeUsd = roundMoney(baseAmountUsd * 0.05);
        const airwallexTotalUsd = roundMoney(baseAmountUsd + airwallexFeeUsd);
        const usdToVnd = Number(process.env.SEPAY_USD_TO_VND_RATE || 26000);
        const sepayAmountVnd = Math.round(baseAmountUsd * usdToVnd);
        const paymentUrl = `${process.env.URL || 'https://foundersvn.com'}/payment?order=${orderId}`;

        try {
            const reservationRows = await sql`
                WITH locked_event AS (
                    SELECT id, max_attendees FROM events WHERE id = ${member.event_id} FOR UPDATE
                ), occupied AS (
                    SELECT COALESCE(SUM(po.ticket_count), 0)::int AS seats
                    FROM payment_orders po
                    JOIN locked_event le ON le.id = po.event_id
                    WHERE po.status = 'paid'
                       OR (po.status IN ('pending', 'preparing') AND po.expires_at > NOW())
                ), eligible AS (
                    SELECT le.* FROM locked_event le, occupied o
                    WHERE o.seats + ${ticketCount} <= le.max_attendees
                ), new_application AS (
                    INSERT INTO applications
                        (first_name, last_name, email, event_id, company, role, industry,
                         social_link, event, event_interest, ticket_count, guest_name,
                         status, payment_status, payment_link, accepted_at, expires_at)
                    SELECT ${member.first_name}, ${member.last_name}, ${String(member.email).toLowerCase()},
                           ${member.event_id}, ${member.company || null}, ${member.role || null},
                           ${member.industry || null}, ${member.social_link || member.linkedin || null},
                           ${member.event_name}, ${member.event_slug}, ${ticketCount}, ${guestName || null},
                           'approved', 'awaiting', ${paymentUrl}, ${now.toISOString()}, ${expiresAt.toISOString()}
                    FROM eligible
                    RETURNING *
                ), new_order AS (
                    INSERT INTO payment_orders
                        (id, application_id, member_id, event_id, status, ticket_count,
                         base_amount_usd, airwallex_fee_usd, airwallex_total_usd,
                         sepay_amount_vnd, sepay_code, provider_environment, expires_at, account_was_existing)
                    SELECT ${orderId}, na.id, ${claims.sub}, ${member.event_id}, 'pending', ${ticketCount},
                           ${baseAmountUsd}, ${airwallexFeeUsd}, ${airwallexTotalUsd},
                           ${sepayAmountVnd}, ${sepayCode}, ${paymentEnvironment()}, ${expiresAt.toISOString()}, true
                    FROM new_application na
                    RETURNING *
                )
                SELECT na.id AS application_id, no.id AS payment_order_id, no.expires_at
                FROM new_application na JOIN new_order no ON no.application_id = na.id`;
            const reservation = reservationRows[0];
            if (!reservation) return json(409, { error: `Not enough capacity for ${ticketCount} more ticket${ticketCount === 1 ? '' : 's'}.` });
            return json(200, {
                success: true,
                approved: true,
                skippedAdminReview: true,
                applicationId: reservation.application_id,
                paymentOrderId: reservation.payment_order_id,
                paymentUrl,
                expiresAt: reservation.expires_at
            });
        } catch (error) {
            console.error('[register-event] additional ticket reservation failed', JSON.stringify({
                message: error.message,
                code: error.code,
                detail: error.detail,
                constraint: error.constraint
            }));
            return json(500, { error: 'Could not reserve the additional ticket.' });
        }
    }

    let application;
    try {
        const inserted = await sql`
            INSERT INTO applications
                (first_name, last_name, email, event_id, company, role, industry,
                 social_link, event, event_interest, ticket_count, guest_name, status)
            VALUES
                (${member.first_name}, ${member.last_name}, ${String(member.email).toLowerCase()},
                 ${member.event_id}, ${member.company || null}, ${member.role || null},
                 ${member.industry || null}, ${member.social_link || member.linkedin || null},
                 ${member.event_name}, ${member.event_slug}, ${ticketCount}, ${guestName || null}, 'pending')
            RETURNING *`;
        application = inserted[0];
    } catch (error) {
        console.error('[register-event] insert failed', JSON.stringify({
            message: error.message,
            code: error.code,
            detail: error.detail,
            constraint: error.constraint
        }));
        return json(500, { error: 'Could not submit event registration.' });
    }
    if (!application) return json(409, { error: 'Could not submit event registration.' });

    const adminUrl = `${process.env.URL || 'https://foundersvn.com'}/admin`;
    const recipients = (process.env.NOTIFY_EMAILS || '').split(',').map(v => v.trim()).filter(Boolean);
    if (recipients.length) {
        const tmpl = notificationEmail({ app: application, adminUrl });
        await sendEmail({ to: recipients, subject: tmpl.subject, html: tmpl.html });
    }
    return json(200, { success: true, applicationId: application.id });
};
