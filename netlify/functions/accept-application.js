// Admin approval: atomically reserves capacity for 48 hours, creates a login,
// and provisions one payment order with Airwallex + SePay options.

const crypto = require('crypto');
const { sql, isConfigured: dbConfigured } = require('./lib/neon');
const {
    deactivatePaymentLink,
    getAccessToken: getAirwallexAccessToken,
    isConfigured: airwallexConfigured,
    diagnostics: airwallexDiagnostics
} = require('./lib/airwallex');
const { createPaymentCode, config: sepayConfig, isConfigured: sepayConfigured } = require('./lib/sepay');
const { paymentEnvironment, isMockPayments, paymentProviderEnabled } = require('./lib/payment-environment');
const { encrypt, decrypt } = require('./lib/field-crypto');
const { sendEmail, approvedWithLoginEmail } = require('./lib/emailer');
const { isAdminRequest, hashPassword, generateTempPassword } = require('./lib/auth');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const HOLD_MS = 48 * 60 * 60 * 1000;

function json(statusCode, obj) {
    return { statusCode, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(obj) };
}

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function publicOrder(order) {
    if (!order) return null;
    let airwallexUrl = null;
    try { airwallexUrl = decrypt(order.airwallex_url_encrypted); } catch (_) {}
    return {
        id: order.id,
        status: order.status,
        ticketCount: Number(order.ticket_count),
        baseAmountUsd: Number(order.base_amount_usd),
        airwallexFeeUsd: Number(order.airwallex_fee_usd),
        airwallexTotalUsd: Number(order.airwallex_total_usd),
        sepayAmountVnd: Number(order.sepay_amount_vnd),
        sepayCode: order.sepay_code,
        airwallexUrl,
        expiresAt: order.expires_at
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!isAdminRequest(event)) return json(401, { error: 'Unauthorized' });
    if (!dbConfigured()) return json(500, { error: 'Server not configured (missing DATABASE_URL).' });

    let id;
    try { id = JSON.parse(event.body || '{}').id; } catch (_) { return json(400, { error: 'Invalid JSON body' }); }
    if (!id) return json(400, { error: 'Missing application id' });

    let app;
    try {
        const rows = await sql`
            SELECT a.*, e.slug AS event_slug, e.name AS event_name, e.event_date, e.event_time,
                   e.location AS event_location, e.venue_name AS event_venue_name,
                   e.venue_address AS event_venue_address, e.dinner_price, e.max_attendees,
                   po.id AS payment_order_id, po.status AS order_status,
                   po.ticket_count AS order_ticket_count, po.base_amount_usd,
                   po.airwallex_fee_usd, po.airwallex_total_usd, po.sepay_amount_vnd,
                   po.sepay_code, po.airwallex_url_encrypted, po.expires_at AS order_expires_at,
                   po.account_was_existing
            FROM applications a
            JOIN events e ON e.id = a.event_id
            LEFT JOIN payment_orders po ON po.application_id = a.id
            WHERE a.id = ${id} LIMIT 1`;
        app = rows[0];
    } catch (error) {
        console.error('[accept-application] load failed:', error.message);
        return json(500, { error: 'Could not load application' });
    }
    if (!app) return json(404, { error: 'Application not found' });
    if (app.payment_order_id) {
        const existing = publicOrder({
            id: app.payment_order_id, status: app.order_status, ticket_count: app.order_ticket_count,
            base_amount_usd: app.base_amount_usd, airwallex_fee_usd: app.airwallex_fee_usd,
            airwallex_total_usd: app.airwallex_total_usd, sepay_amount_vnd: app.sepay_amount_vnd,
            sepay_code: app.sepay_code, airwallex_url_encrypted: app.airwallex_url_encrypted,
            expires_at: app.order_expires_at
        });
        return json(200, {
            success: true,
            alreadyAccepted: true,
            accountReused: app.account_was_existing === true,
            payment: existing
        });
    }
    if (app.status !== 'pending') return json(409, { error: `Application is already ${app.status}.` });
    const useAirwallex = paymentProviderEnabled('airwallex');
    const useSepay = paymentProviderEnabled('sepay');
    const mockPayments = isMockPayments();
    const airwallexMissing = !mockPayments && useAirwallex && !airwallexConfigured();
    const sepayMissing = !mockPayments && useSepay && !sepayConfigured();
    if (airwallexMissing || sepayMissing) {
        console.error('[accept-application] payment config incomplete', JSON.stringify({
            environment: paymentEnvironment(),
            providers: { airwallex: useAirwallex, sepay: useSepay },
            airwallex: airwallexDiagnostics(),
            sepay: {
                configured: sepayConfigured(),
                bankPresent: Boolean(sepayConfig().bank),
                accountPresent: Boolean(sepayConfig().account),
                accountNamePresent: Boolean(sepayConfig().accountName),
                webhookSecretPresent: Boolean(sepayConfig().webhookSecret)
            }
        }));
        return json(503, {
            error: `${paymentEnvironment()} payment configuration is incomplete for: ${[
                airwallexMissing ? 'Airwallex' : null,
                sepayMissing ? 'SePay' : null
            ].filter(Boolean).join(', ')}.`
        });
    }
    if (!mockPayments && useAirwallex) {
        try {
            await getAirwallexAccessToken();
        } catch (error) {
            console.error('[accept-application] airwallex auth failed before reservation', JSON.stringify({
                message: error.message,
                airwallex: airwallexDiagnostics()
            }));
            return json(503, {
                error: 'Airwallex production credentials are invalid. Check AIRWALLEX_API_KEY and AIRWALLEX_CLIENT_ID.'
            });
        }
    }

    const ticketCount = Number(app.ticket_count || 1);
    if (![1, 2].includes(ticketCount)) return json(400, { error: 'Ticket quantity must be 1 or 2.' });
    if (ticketCount === 2 && !String(app.guest_name || '').trim()) {
        return json(400, { error: 'Partner / co-founder name is required for two tickets.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + HOLD_MS);
    const orderId = crypto.randomUUID();
    const sepayCode = createPaymentCode(orderId);
    const unitPrice = Number(app.dinner_price || 150);
    const baseAmountUsd = roundMoney(unitPrice * ticketCount);
    const airwallexFeeUsd = roundMoney(baseAmountUsd * 0.05);
    const airwallexTotalUsd = roundMoney(baseAmountUsd + airwallexFeeUsd);
    const usdToVnd = Number(process.env.SEPAY_USD_TO_VND_RATE || 26000);
    const sepayAmountVnd = Math.round(baseAmountUsd * usdToVnd);
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const email = String(app.email).trim().toLowerCase();

    const existingTicketRows = await sql`
        SELECT COALESCE(SUM(po.ticket_count), 0)::int AS seats
        FROM payment_orders po
        JOIN members m ON m.id = po.member_id
        WHERE po.event_id = ${app.event_id}
          AND po.application_id <> ${id}
          AND LOWER(m.email) = ${email}
          AND (po.status = 'paid' OR (po.status IN ('pending', 'preparing') AND po.expires_at > NOW()))`;
    const existingTickets = Number(existingTicketRows[0]?.seats || 0);
    if (existingTickets + ticketCount > 2) {
        return json(409, { error: `This member already has ${existingTickets} active ticket${existingTickets === 1 ? '' : 's'} for this event. The maximum is 2.` });
    }

    // Airwallex Hosted Payment Page client secrets last 60 minutes, so the
    // PaymentIntent is created on demand when the member opens /payment.
    // The 48-hour reservation itself is provider-neutral.
    const airwallexLink = null;

    let reserved;
    try {
        const rows = await sql`
            WITH locked_event AS (
                SELECT id, max_attendees FROM events WHERE id = ${app.event_id} FOR UPDATE
            ), occupied AS (
                SELECT COALESCE(SUM(po.ticket_count), 0)::int AS seats
                FROM payment_orders po
                JOIN locked_event le ON le.id = po.event_id
                WHERE po.status = 'paid'
                   OR (po.status IN ('pending', 'preparing') AND po.expires_at > NOW())
            ), eligible AS (
                SELECT le.* FROM locked_event le, occupied o
                WHERE o.seats + ${ticketCount} <= le.max_attendees
            ), existing_member AS (
                SELECT id, account_status FROM members WHERE LOWER(email) = ${email}
            ), upsert_member AS (
                INSERT INTO members
                    (email, first_name, last_name, company, role, industry, is_approved,
                     password_hash, must_reset_password, account_status, payment_access_expires_at)
                SELECT ${email}, ${app.first_name || ''}, ${app.last_name || '-'}, ${app.company || null},
                       ${app.role || null}, ${app.industry || null}, true, ${passwordHash}, true,
                       CASE WHEN EXISTS (SELECT 1 FROM existing_member WHERE account_status = 'active')
                            THEN 'active' ELSE 'payment_pending' END,
                       ${expiresAt.toISOString()}
                FROM eligible
                ON CONFLICT (email) DO UPDATE SET
                    is_approved = true,
                    password_hash = CASE WHEN members.account_status = 'active' THEN members.password_hash ELSE EXCLUDED.password_hash END,
                    must_reset_password = CASE WHEN members.account_status = 'active' THEN members.must_reset_password ELSE true END,
                    account_status = CASE WHEN members.account_status = 'active' THEN 'active' ELSE 'payment_pending' END,
                    payment_access_expires_at = EXCLUDED.payment_access_expires_at,
                    first_name = COALESCE(NULLIF(members.first_name, ''), EXCLUDED.first_name),
                    last_name = COALESCE(NULLIF(members.last_name, ''), EXCLUDED.last_name),
                    company = COALESCE(members.company, EXCLUDED.company),
                    role = COALESCE(members.role, EXCLUDED.role),
                    industry = COALESCE(members.industry, EXCLUDED.industry),
                    updated_at = NOW()
                RETURNING *
            ), new_order AS (
                INSERT INTO payment_orders
                    (id, application_id, member_id, event_id, status, ticket_count,
                     base_amount_usd, airwallex_fee_usd, airwallex_total_usd,
                     sepay_amount_vnd, sepay_code, airwallex_link_id, airwallex_url_encrypted,
                     provider_environment, expires_at, account_was_existing)
                SELECT ${orderId}, ${id}, um.id, ${app.event_id}, 'pending', ${ticketCount},
                       ${baseAmountUsd}, ${airwallexFeeUsd}, ${airwallexTotalUsd},
                       ${sepayAmountVnd}, ${sepayCode}, ${airwallexLink?.id || null}, ${airwallexLink?.url ? encrypt(airwallexLink.url) : null},
                       ${paymentEnvironment()}, ${expiresAt.toISOString()},
                       EXISTS (SELECT 1 FROM existing_member WHERE account_status = 'active')
                FROM upsert_member um
                RETURNING *
            ), updated_application AS (
                UPDATE applications SET status = 'approved', accepted_at = ${now.toISOString()},
                    expires_at = ${expiresAt.toISOString()}, payment_status = 'awaiting',
                    payment_link = ${(process.env.URL || 'https://foundersvn.com') + '/payment?order=' + orderId},
                    reviewed_at = ${now.toISOString()}, reminders_sent = '{}'
                WHERE id = ${id} AND EXISTS (SELECT 1 FROM new_order)
                RETURNING id
            ), reserved_attendance AS (
                INSERT INTO event_attendance
                    (event_id, member_id, application_id, ticket_type, payment_status,
                     approved_at, seat_count, guest_name)
                SELECT ${app.event_id}, no.member_id, ${id}, 'dinner', 'awaiting',
                       ${now.toISOString()}, ${ticketCount}, ${app.guest_name || null}
                FROM new_order no
                ON CONFLICT (event_id, member_id) DO UPDATE SET
                    application_id = CASE
                        WHEN event_attendance.payment_status = 'paid' THEN event_attendance.application_id
                        ELSE EXCLUDED.application_id
                    END,
                    payment_status = CASE
                        WHEN event_attendance.payment_status = 'paid' THEN 'paid'
                        ELSE 'awaiting'
                    END,
                    approved_at = EXCLUDED.approved_at,
                    seat_count = CASE
                        WHEN event_attendance.application_id = EXCLUDED.application_id THEN GREATEST(event_attendance.seat_count, EXCLUDED.seat_count)
                        WHEN event_attendance.payment_status = 'paid' THEN event_attendance.seat_count
                        ELSE LEAST(2, event_attendance.seat_count + EXCLUDED.seat_count)
                    END,
                    guest_name = COALESCE(event_attendance.guest_name, EXCLUDED.guest_name)
                RETURNING id
            )
            SELECT no.*, um.email, um.first_name, um.last_name, um.is_approved, um.account_status
            FROM new_order no JOIN upsert_member um ON um.id = no.member_id`;
        reserved = rows[0];
    } catch (error) {
        console.error('[accept-application] reservation failed', JSON.stringify({
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint,
            table: error.table,
            column: error.column,
            constraint: error.constraint,
            applicationId: id,
            eventId: app.event_id,
            ticketCount
        }));
        try { if (airwallexLink?.id) await deactivatePaymentLink(airwallexLink.id); } catch (cleanupError) {
            console.error('[accept-application] orphan payment-link cleanup failed:', cleanupError.message);
        }
        return json(500, { error: 'Could not reserve the event seat(s).' });
    }
    if (!reserved) {
        try { if (airwallexLink?.id) await deactivatePaymentLink(airwallexLink.id); } catch (cleanupError) {
            console.error('[accept-application] capacity cleanup failed:', cleanupError.message);
        }
        return json(409, { error: `Not enough capacity for ${ticketCount} ticket${ticketCount === 1 ? '' : 's'}.` });
    }

    const paymentUrl = `${process.env.URL || 'https://foundersvn.com'}/payment?order=${orderId}`;

    const sepay = sepayConfig();
    const eventDetails = {
        name: app.event_name,
        date: new Date(app.event_date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
        }),
        time: String(app.event_time || '18:00').slice(0, 5),
        location: app.event_location,
        venueName: app.event_venue_name,
        venueAddress: app.event_venue_address,
        price: `$${baseAmountUsd.toFixed(2)} USD for ${ticketCount} ticket${ticketCount === 1 ? '' : 's'}`
    };
    let emailResult = { success: false };
    try {
        const tmpl = approvedWithLoginEmail({
            firstName: app.first_name, email, tempPassword,
            loginUrl: `${process.env.URL || 'https://foundersvn.com'}/login`,
            paymentUrl, airwallexUrl: airwallexLink?.url || null,
            sepay: useSepay && sepay.account ? { bank: sepay.bank, account: sepay.account, accountName: sepay.accountName, amountVnd: sepayAmountVnd, code: sepayCode } : null,
            expiresAt, ticketCount, existingAccount: reserved.account_was_existing === true, event: eventDetails
        });
        emailResult = await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html, tracking: {
            type: 'approval', applicationId: id, memberId: reserved.member_id, eventId: app.event_id
        } });
        if (emailResult.success) await sql`UPDATE applications SET approval_email_sent_at = NOW() WHERE id = ${id}`;
    } catch (error) {
        console.error('[accept-application] approval email failed:', error.message);
    }

    const payment = publicOrder({ ...reserved, status: 'pending', airwallex_url_encrypted: airwallexLink?.url ? encrypt(airwallexLink.url) : null });
    const accountReused = reserved.account_was_existing === true;
    return json(200, {
        success: true,
        expiresAt: expiresAt.toISOString(),
        accountReused,
        tempPassword: accountReused ? null : tempPassword,
        loginUrl: `${process.env.URL || 'https://foundersvn.com'}/login`,
        paymentUrl,
        payment,
        member: { id: reserved.member_id, email, firstName: app.first_name, lastName: app.last_name, accountStatus: reserved.account_status },
        emailSent: emailResult.success,
        emailMock: Boolean(emailResult.mock),
        airwallexAvailable: Boolean(useAirwallex),
        sepayAvailable: Boolean(useSepay && sepay.account)
    });
};
