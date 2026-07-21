const { sql, isConfigured } = require('./lib/neon');
const { isAdminRequest, generateTempPassword, hashPassword } = require('./lib/auth');
const { sendEmail, approvedWithLoginEmail, reminderEmail } = require('./lib/emailer');
const { config: sepayConfig, isConfigured: sepayConfigured } = require('./lib/sepay');
const { publicBaseUrl } = require('./lib/site-url');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(statusCode, body) {
    return { statusCode, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(body) };
}

function eventDetails(row) {
    return {
        name: row.event_name,
        date: new Date(row.event_date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
        }),
        time: String(row.event_time || '18:00').slice(0, 5),
        location: row.event_location,
        venueName: row.event_venue_name,
        venueAddress: row.event_venue_address,
        price: `$${Number(row.base_amount_usd || row.dinner_price || 0).toFixed(2)} USD for ${Number(row.ticket_count || 1)} ticket${Number(row.ticket_count || 1) === 1 ? '' : 's'}`
    };
}

exports.handler = async event => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!isAdminRequest(event)) return json(401, { error: 'Unauthorized' });
    if (!isConfigured()) return json(500, { error: 'Server not configured (missing DATABASE_URL).' });

    let id, action, preview;
    try {
        ({ id, action, preview = false } = JSON.parse(event.body || '{}'));
    } catch (_) {
        return json(400, { error: 'Invalid JSON body' });
    }
    if (!id || !['resend_approval', 'send_reminder'].includes(action)) return json(400, { error: 'Invalid application action' });

    const rows = await sql`
        SELECT a.*, e.name AS event_name, e.event_date, e.event_time, e.location AS event_location,
               e.venue_name AS event_venue_name, e.venue_address AS event_venue_address, e.dinner_price,
               m.id AS member_id, m.account_status, m.last_login_at, COALESCE(m.login_count, 0)::int AS login_count,
               po.id AS payment_order_id, po.status AS order_status, po.ticket_count,
               po.base_amount_usd, po.sepay_amount_vnd, po.sepay_code, po.expires_at
        FROM applications a
        JOIN events e ON e.id = a.event_id
        LEFT JOIN members m ON LOWER(m.email) = LOWER(a.email)
        LEFT JOIN payment_orders po ON po.application_id = a.id
        WHERE a.id = ${id} LIMIT 1`;
    const application = rows[0];
    if (!application) return json(404, { error: 'Application not found' });
    if (application.status !== 'approved' || !application.payment_order_id) return json(409, { error: 'Only approved applications with a reservation can receive payment follow-ups.' });
    if (application.order_status === 'paid') return json(409, { error: 'This reservation is already paid.' });

    const paymentUrl = application.payment_link || `${publicBaseUrl()}/payment?order=${application.payment_order_id}`;
    const tracking = { applicationId: id, memberId: application.member_id, eventId: application.event_id };
    let template;

    if (action === 'resend_approval') {
        let tempPassword = preview ? 'Shown only in the email sent to this member' : null;
        const canIssueNewPassword = Number(application.login_count || 0) === 0 && application.account_status === 'payment_pending';
        if (canIssueNewPassword && !preview) {
            tempPassword = generateTempPassword();
            const passwordHash = await hashPassword(tempPassword);
            await sql`
                UPDATE members SET password_hash = ${passwordHash}, must_reset_password = true, updated_at = NOW()
                WHERE id = ${application.member_id}`;
        }
        const sepay = sepayConfig();
        template = approvedWithLoginEmail({
            firstName: application.first_name,
            email: application.email,
            tempPassword,
            loginUrl: `${publicBaseUrl()}/login`,
            paymentUrl,
            sepay: sepayConfigured() && sepay.account ? {
                bank: sepay.bank, account: sepay.account, accountName: sepay.accountName,
                amountVnd: Number(application.sepay_amount_vnd), code: application.sepay_code
            } : null,
            expiresAt: application.expires_at,
            ticketCount: Number(application.ticket_count || 1),
            existingAccount: !canIssueNewPassword,
            event: eventDetails(application)
        });
        tracking.type = 'approval_resend';
    } else {
        const hoursLeft = Math.max(1, Math.ceil((new Date(application.expires_at).getTime() - Date.now()) / 3600000));
        template = reminderEmail({
            firstName: application.first_name,
            paymentUrl,
            hoursLeft,
            reminderKind: hoursLeft <= 6 ? 'final' : 'initial',
            event: eventDetails(application)
        });
        tracking.type = 'manual_payment_reminder';
    }

    if (preview) return json(200, {
        preview: true,
        action,
        email: application.email,
        subject: template.subject,
        html: template.html
    });

    const result = await sendEmail({ to: application.email, subject: template.subject, html: template.html, tracking });
    if (!result.success) return json(502, { error: result.error || 'Email could not be sent' });
    if (action === 'resend_approval') await sql`UPDATE applications SET approval_email_sent_at = NOW() WHERE id = ${id}`;
    return json(200, { success: true, action, email: application.email, mock: Boolean(result.mock) });
};
