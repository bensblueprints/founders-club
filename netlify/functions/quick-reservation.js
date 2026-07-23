const crypto = require('crypto');
const { sql, isConfigured } = require('./lib/neon');
const { createPaymentIntent, isConfigured: airwallexConfigured } = require('./lib/airwallex');
const { completePayment } = require('./lib/complete-payment');
const { encrypt, decrypt } = require('./lib/field-crypto');
const { createPaymentCode, config: sepayConfig, qrUrl } = require('./lib/sepay');
const {
    paymentEnvironment,
    isMockPayments,
    paymentProviderEnabled
} = require('./lib/payment-environment');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const HOLD_MS = 48 * 60 * 60 * 1000;
const DEFAULT_EVENT_SLUG = 'danang-jul-2026';

function json(statusCode, value) {
    return { statusCode, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(value) };
}

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function splitName(value) {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
    return {
        firstName: parts.shift() || '',
        lastName: parts.join(' ') || '-'
    };
}

function tokenHash(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function publicEvent(row) {
    return {
        id: row.event_id,
        slug: row.event_slug,
        name: row.event_name,
        date: row.event_date,
        time: String(row.event_time || '18:00').slice(0, 5),
        location: row.event_location,
        venueName: row.event_venue_name,
        venueAddress: row.event_venue_address,
        capacity: Number(row.max_attendees || 25)
    };
}

function publicOrder(row, accessToken, credentials = null) {
    const sepay = sepayConfig();
    return {
        id: row.id,
        status: row.status,
        ticketCount: Number(row.ticket_count),
        baseAmountUsd: Number(row.base_amount_usd),
        airwallexFeeUsd: Number(row.airwallex_fee_usd),
        airwallexTotalUsd: Number(row.airwallex_total_usd),
        sepayAmountVnd: Number(row.sepay_amount_vnd),
        sepayCode: row.sepay_code,
        sepayQrUrl: qrUrl({ amountVnd: row.sepay_amount_vnd, code: row.sepay_code }),
        sepayBank: sepay.bank || null,
        sepayAccount: sepay.account || null,
        sepayAccountName: sepay.accountName || null,
        expiresAt: row.expires_at,
        paidAt: row.paid_at,
        paidProvider: row.paid_provider,
        email: row.email,
        fullName: `${row.first_name || ''} ${row.last_name === '-' ? '' : row.last_name || ''}`.trim(),
        event: publicEvent(row),
        providers: {
            sepay: paymentProviderEnabled('sepay') && Boolean(sepay.account),
            airwallex: paymentProviderEnabled('airwallex') && airwallexConfigured()
        },
        mockPayments: isMockPayments(),
        accessToken,
        credentials
    };
}

async function authorizedOrder(orderId, accessToken) {
    if (!orderId || !accessToken) return null;
    const rows = await sql`
        SELECT po.*, a.first_name, a.last_name, a.email,
               e.id AS event_id, e.slug AS event_slug, e.name AS event_name,
               e.event_date, e.event_time, e.location AS event_location,
               e.venue_name AS event_venue_name, e.venue_address AS event_venue_address,
               e.max_attendees
        FROM payment_orders po
        JOIN applications a ON a.id = po.application_id
        JOIN events e ON e.id = po.event_id
        WHERE po.id = ${orderId}
          AND po.quick_checkout = TRUE
          AND po.quick_access_token_hash = ${tokenHash(accessToken)}
        LIMIT 1`;
    return rows[0] || null;
}

async function createReservation(body) {
    const fullName = String(body.fullName || '').trim();
    const email = normalizeEmail(body.email);
    const phone = String(body.phone || '').trim();
    const ticketCount = Number(body.ticketCount || 1);
    const eventSlug = String(body.eventSlug || DEFAULT_EVENT_SLUG).trim();
    const { firstName, lastName } = splitName(fullName);

    if (fullName.length < 2) return json(400, { error: 'Enter your full name.' });
    if (!validEmail(email)) return json(400, { error: 'Enter a valid email address.' });
    if (phone.length < 6 || phone.length > 50) return json(400, { error: 'Enter a valid phone, WhatsApp, or Zalo number.' });
    if (![1, 2].includes(ticketCount)) return json(400, { error: 'Ticket quantity must be 1 or 2.' });

    const eventRows = await sql`
        SELECT id AS event_id, slug AS event_slug, name AS event_name, event_date,
               event_time, location AS event_location, venue_name AS event_venue_name,
               venue_address AS event_venue_address, dinner_price, max_attendees
        FROM events
        WHERE slug = ${eventSlug} AND status IN ('open', 'upcoming')
        LIMIT 1`;
    const selectedEvent = eventRows[0];
    if (!selectedEvent) return json(404, { error: 'This event is not currently available for quick checkout.' });

    const activeRows = await sql`
        SELECT COALESCE(SUM(po.ticket_count), 0)::int AS seats
        FROM payment_orders po
        JOIN members m ON m.id = po.member_id
        WHERE po.event_id = ${selectedEvent.event_id}
          AND LOWER(m.email) = ${email}
          AND po.status = 'paid'`;
    const paidSeats = Number(activeRows[0]?.seats || 0);
    if (paidSeats + ticketCount > 2) {
        return json(409, { error: `This email already has ${paidSeats} paid ticket${paidSeats === 1 ? '' : 's'} for this event. The maximum is 2.` });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + HOLD_MS);
    const orderId = crypto.randomUUID();
    const accessToken = crypto.randomBytes(32).toString('base64url');
    const accessTokenHash = tokenHash(accessToken);
    const sepayCode = createPaymentCode(orderId);
    const baseAmountUsd = roundMoney(Number(selectedEvent.dinner_price || 150) * ticketCount);
    const airwallexFeeUsd = roundMoney(baseAmountUsd * 0.05);
    const airwallexTotalUsd = roundMoney(baseAmountUsd + airwallexFeeUsd);
    const sepayAmountVnd = Math.round(baseAmountUsd * Number(process.env.SEPAY_USD_TO_VND_RATE || 26000));
    const paymentUrl = `${process.env.URL || 'https://foundersvn.com'}/reservation?order=${orderId}`;

    let row;
    try {
        const rows = await sql`
            WITH existing_member AS (
                SELECT id, password_hash, account_status
                FROM members WHERE LOWER(email) = ${email} LIMIT 1
            ), cancelled_orders AS (
                UPDATE payment_orders po SET status = 'cancelled', updated_at = NOW()
                WHERE po.quick_checkout = TRUE
                  AND po.status IN ('pending', 'preparing')
                  AND po.event_id = ${selectedEvent.event_id}
                  AND po.member_id IN (SELECT id FROM existing_member)
                RETURNING po.application_id
            ), cancelled_applications AS (
                UPDATE applications a SET status = 'expired', payment_status = 'expired'
                WHERE a.id IN (SELECT application_id FROM cancelled_orders)
                RETURNING a.id
            ), updated_member AS (
                UPDATE members SET
                    first_name = COALESCE(NULLIF(members.first_name, ''), ${firstName}),
                    last_name = COALESCE(NULLIF(members.last_name, ''), ${lastName}),
                    whatsapp = COALESCE(NULLIF(members.whatsapp, ''), ${phone}),
                    account_status = CASE
                        WHEN members.password_hash IS NULL THEN 'payment_pending'
                        ELSE members.account_status
                    END,
                    payment_access_expires_at = CASE
                        WHEN members.password_hash IS NULL THEN ${expiresAt.toISOString()}
                        ELSE members.payment_access_expires_at
                    END,
                    updated_at = NOW()
                WHERE id IN (SELECT id FROM existing_member)
                RETURNING *
            ), inserted_member AS (
                INSERT INTO members
                    (email, first_name, last_name, whatsapp, is_approved, password_hash,
                     must_reset_password, account_status, payment_access_expires_at)
                SELECT ${email}, ${firstName}, ${lastName}, ${phone}, FALSE, NULL,
                       FALSE, 'payment_pending', ${expiresAt.toISOString()}
                WHERE NOT EXISTS (SELECT 1 FROM existing_member)
                RETURNING *
            ), upsert_member AS (
                SELECT * FROM updated_member
                UNION ALL
                SELECT * FROM inserted_member
            ), new_application AS (
                INSERT INTO applications
                    (first_name, last_name, email, event_id, social_link, event,
                     event_interest, ticket_count, status, payment_status,
                     payment_link, accepted_at, expires_at, reviewed_at)
                SELECT ${firstName}, ${lastName}, ${email}, ${selectedEvent.event_id},
                       ${`Phone / WhatsApp / Zalo: ${phone}`}, ${selectedEvent.event_name},
                       ${selectedEvent.event_slug}, ${ticketCount}, 'approved', 'awaiting',
                       ${paymentUrl}, ${now.toISOString()}, ${expiresAt.toISOString()}, ${now.toISOString()}
                FROM upsert_member
                RETURNING *
            ), new_order AS (
                INSERT INTO payment_orders
                    (id, application_id, member_id, event_id, status, ticket_count,
                     base_amount_usd, airwallex_fee_usd, airwallex_total_usd,
                     sepay_amount_vnd, sepay_code, provider_environment, expires_at,
                     account_was_existing, quick_checkout, quick_new_member,
                     quick_access_token_hash)
                SELECT ${orderId}, na.id, um.id, ${selectedEvent.event_id}, 'pending', ${ticketCount},
                       ${baseAmountUsd}, ${airwallexFeeUsd}, ${airwallexTotalUsd},
                       ${sepayAmountVnd}, ${sepayCode}, ${paymentEnvironment()}, ${expiresAt.toISOString()},
                       (um.password_hash IS NOT NULL), TRUE, (um.password_hash IS NULL),
                       ${accessTokenHash}
                FROM new_application na CROSS JOIN upsert_member um
                RETURNING *
            )
            SELECT no.*, na.first_name, na.last_name, na.email,
                   ${selectedEvent.event_id}::uuid AS event_id,
                   ${selectedEvent.event_slug}::text AS event_slug,
                   ${selectedEvent.event_name}::text AS event_name,
                   ${selectedEvent.event_date}::date AS event_date,
                   ${selectedEvent.event_time}::time AS event_time,
                   ${selectedEvent.event_location}::text AS event_location,
                   ${selectedEvent.event_venue_name}::text AS event_venue_name,
                   ${selectedEvent.event_venue_address}::text AS event_venue_address,
                   ${selectedEvent.max_attendees}::int AS max_attendees
            FROM new_order no JOIN new_application na ON na.id = no.application_id`;
        row = rows[0];
    } catch (error) {
        console.error('[quick-reservation] create failed', JSON.stringify({
            message: error.message,
            code: error.code,
            constraint: error.constraint
        }));
        return json(500, { error: 'Could not create the payment reservation. Please try again.' });
    }
    if (!row) return json(409, { error: 'Could not create the payment reservation.' });
    return json(200, { success: true, order: publicOrder(row, accessToken) });
}

async function getStatus(body) {
    let order = await authorizedOrder(body.orderId, body.accessToken);
    if (!order) return json(403, { error: 'This payment link is invalid or you do not have access to it.' });
    if (['pending', 'preparing'].includes(order.status) && new Date(order.expires_at).getTime() <= Date.now()) {
        await sql`
            WITH expired_order AS (
                UPDATE payment_orders SET status = 'expired', updated_at = NOW()
                WHERE id = ${order.id} AND status IN ('pending', 'preparing')
                RETURNING application_id, member_id, quick_new_member
            ), expired_application AS (
                UPDATE applications a SET status = 'expired', payment_status = 'expired'
                FROM expired_order eo WHERE a.id = eo.application_id RETURNING a.id
            )
            UPDATE members m SET
                account_status = CASE WHEN m.password_hash IS NULL THEN 'locked' ELSE m.account_status END,
                payment_access_expires_at = NULL, updated_at = NOW()
            FROM expired_order eo WHERE m.id = eo.member_id`;
        order = { ...order, status: 'expired' };
    }
    let credentials = null;
    if (order.status === 'paid') {
        if (order.quick_new_member && order.quick_temp_password_encrypted) {
            credentials = { email: order.email, temporaryPassword: decrypt(order.quick_temp_password_encrypted), existingAccount: false };
            await sql`
                UPDATE payment_orders SET quick_credentials_revealed_at = COALESCE(quick_credentials_revealed_at, NOW()),
                    updated_at = NOW() WHERE id = ${order.id}`;
        } else {
            credentials = { email: order.email, temporaryPassword: null, existingAccount: true };
        }
    }
    return json(200, { success: true, order: publicOrder(order, body.accessToken, credentials) });
}

async function createCardCheckout(body) {
    const order = await authorizedOrder(body.orderId, body.accessToken);
    if (!order) return json(403, { error: 'This payment link is invalid or you do not have access to it.' });
    if (order.status !== 'pending' || new Date(order.expires_at).getTime() <= Date.now()) {
        return json(409, { error: 'This payment reservation is no longer active.' });
    }
    if (!paymentProviderEnabled('airwallex') || !airwallexConfigured()) {
        return json(503, { error: 'Card checkout is not currently available. Please use SePay QR.' });
    }
    const createdAt = order.airwallex_intent_created_at && new Date(order.airwallex_intent_created_at).getTime();
    if (order.airwallex_intent_id && order.airwallex_client_secret_encrypted && createdAt > Date.now() - 50 * 60 * 1000) {
        return json(200, {
            intentId: order.airwallex_intent_id,
            clientSecret: decrypt(order.airwallex_client_secret_encrypted),
            currency: 'USD',
            environment: order.provider_environment === 'production' ? 'prod' : 'demo'
        });
    }
    const configuredUrl = String(process.env.URL || '');
    const publicBase = configuredUrl.startsWith('https://') ? configuredUrl : 'https://foundersvn.com';
    const returnUrl = `${publicBase}/reservation?order=${encodeURIComponent(order.id)}&returned=1`;
    try {
        const intent = await createPaymentIntent({
            amount: Number(order.airwallex_total_usd),
            currency: 'USD',
            orderId: order.id,
            requestId: crypto.randomUUID(),
            returnUrl,
            customer: { email: order.email, firstName: order.first_name, lastName: order.last_name }
        });
        await sql`
            UPDATE payment_orders SET airwallex_intent_id = ${intent.id},
                airwallex_client_secret_encrypted = ${encrypt(intent.clientSecret)},
                airwallex_intent_created_at = NOW(), updated_at = NOW()
            WHERE id = ${order.id}`;
        return json(200, {
            intentId: intent.id,
            clientSecret: intent.clientSecret,
            currency: 'USD',
            environment: order.provider_environment === 'production' ? 'prod' : 'demo'
        });
    } catch (error) {
        console.error('[quick-reservation] Airwallex checkout failed:', error.message);
        return json(502, { error: 'Could not open secure card checkout. Please try again or use SePay QR.' });
    }
}

async function mockPay(body) {
    if (!isMockPayments()) return json(404, { error: 'Not found' });
    const order = await authorizedOrder(body.orderId, body.accessToken);
    if (!order) return json(403, { error: 'This payment link is invalid or you do not have access to it.' });
    const provider = body.provider === 'sepay' ? 'sepay' : 'airwallex';
    const result = await completePayment({
        provider,
        providerEventId: `mock-quick-${crypto.randomUUID()}`,
        providerTransactionId: `mock-quick-${Date.now()}`,
        orderId: order.id,
        amount: provider === 'sepay' ? order.sepay_amount_vnd : order.airwallex_total_usd,
        currency: provider === 'sepay' ? 'VND' : 'USD',
        payload: { mock: true, quickCheckout: true }
    });
    return json(result.paid ? 200 : 409, result);
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!isConfigured()) return json(503, { error: 'Database not configured.' });
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { error: 'Invalid JSON body.' }); }
    try {
        if (body.action === 'create') return await createReservation(body);
        if (body.action === 'status') return await getStatus(body);
        if (body.action === 'card') return await createCardCheckout(body);
        if (body.action === 'mockPay') return await mockPay(body);
        return json(400, { error: 'Unknown quick reservation action.' });
    } catch (error) {
        console.error('[quick-reservation] request failed:', error.message);
        return json(500, { error: 'Could not process the quick reservation.' });
    }
};

exports._helpers = { normalizeEmail, splitName, tokenHash, validEmail };
