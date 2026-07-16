const { sql } = require('./neon');
const { sendEmail, paymentConfirmedEmail } = require('./emailer');
const { paymentEnvironment } = require('./payment-environment');
const { deactivatePaymentLink } = require('./airwallex');

function moneyEqual(a, b) {
    return Math.abs(Number(a) - Number(b)) < 0.005;
}

async function findOrder({ orderId, applicationId, sepayCode, airwallexLinkId }) {
    if (orderId) {
        const rows = await sql`
            SELECT po.*, a.first_name, a.email, e.name AS event_name,
                   e.event_date, e.event_time, e.location AS event_location
            FROM payment_orders po
            JOIN applications a ON a.id = po.application_id
            JOIN events e ON e.id = po.event_id
            WHERE po.id = ${orderId} LIMIT 1`;
        return rows[0] || null;
    }
    if (applicationId) {
        const rows = await sql`
            SELECT po.*, a.first_name, a.email, e.name AS event_name,
                   e.event_date, e.event_time, e.location AS event_location
            FROM payment_orders po
            JOIN applications a ON a.id = po.application_id
            JOIN events e ON e.id = po.event_id
            WHERE po.application_id = ${applicationId} LIMIT 1`;
        return rows[0] || null;
    }
    if (sepayCode) {
        const rows = await sql`
            SELECT po.*, a.first_name, a.email, e.name AS event_name,
                   e.event_date, e.event_time, e.location AS event_location
            FROM payment_orders po
            JOIN applications a ON a.id = po.application_id
            JOIN events e ON e.id = po.event_id
            WHERE UPPER(po.sepay_code) = ${String(sepayCode).toUpperCase()} LIMIT 1`;
        return rows[0] || null;
    }
    if (airwallexLinkId) {
        const rows = await sql`
            SELECT po.*, a.first_name, a.email, e.name AS event_name,
                   e.event_date, e.event_time, e.location AS event_location
            FROM payment_orders po
            JOIN applications a ON a.id = po.application_id
            JOIN events e ON e.id = po.event_id
            WHERE po.airwallex_link_id = ${String(airwallexLinkId)} LIMIT 1`;
        return rows[0] || null;
    }
    return null;
}

async function sendConfirmation(order) {
    if (!order || order.confirmation_email_sent_at) return true;
    const baseUrl = process.env.URL || 'https://foundersvn.com';
    const mealUrl = `${baseUrl}/meal`;
    const paymentUrl = `${baseUrl}/payment?order=${order.id}`;
    const profileUrl = `${baseUrl}/profile`;
    const appUrl = `${baseUrl}/login`;
    const tmpl = paymentConfirmedEmail({
        firstName: order.first_name,
        email: order.email,
        mealUrl,
        appUrl,
        profileUrl,
        receiptUrl: paymentUrl,
        paymentMethod: order.paid_provider === 'airwallex' ? 'Airwallex card' : order.paid_provider === 'sepay' ? 'SePay / VietQR bank transfer' : order.paid_provider || 'Confirmed payment',
        communityUrl: process.env.WHATSAPP_LINK || process.env.COMMUNITY_LINK || '',
        ticketCount: Number(order.ticket_count || 1),
        event: {
            name: order.event_name,
            date: new Date(order.event_date).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
            }),
            time: String(order.event_time || '18:00').slice(0, 5),
            location: order.event_location
        }
    });
    const result = await sendEmail({ to: order.email, subject: tmpl.subject, html: tmpl.html, tracking: {
        type: 'payment_confirmation', applicationId: order.application_id,
        memberId: order.member_id, eventId: order.event_id
    } });
    if (result.success) {
        await sql`UPDATE payment_orders SET confirmation_email_sent_at = NOW(), updated_at = NOW() WHERE id = ${order.id}`;
    }
    return result.success;
}

async function completePayment({
    provider, providerEventId, providerTransactionId, orderId, applicationId,
    sepayCode, airwallexLinkId, amount, currency, payload
}) {
    let order = await findOrder({ orderId, applicationId, sepayCode, airwallexLinkId });
    if (!order) return { matched: false, reason: 'order_not_found' };
    if (order.provider_environment && order.provider_environment !== paymentEnvironment()) {
        return { matched: true, paid: false, reason: 'provider_environment_mismatch' };
    }

    const expectedAmount = provider === 'airwallex' ? order.airwallex_total_usd : order.sepay_amount_vnd;
    const expectedCurrency = provider === 'airwallex' ? 'USD' : 'VND';
    if (!moneyEqual(amount, expectedAmount) || String(currency || '').toUpperCase() !== expectedCurrency) {
        return { matched: true, paid: false, reason: 'amount_or_currency_mismatch' };
    }

    // Store a deliberately minimized audit record and use provider_event_id as
    // the retry/replay deduplication key. Bank descriptions, full accounts,
    // customer email, and other provider PII are not retained here.
    const auditPayload = provider === 'sepay' ? {
        id: payload?.id,
        gateway: payload?.gateway,
        transactionDate: payload?.transactionDate,
        accountLast4: String(payload?.accountNumber || '').slice(-4),
        code: payload?.code,
        transferType: payload?.transferType,
        transferAmount: payload?.transferAmount,
        referenceCode: payload?.referenceCode
    } : {
        id: payload?.id,
        name: payload?.name || payload?.type,
        createdAt: payload?.created_at,
        paymentIntentId: payload?.data?.object?.id || payload?.data?.id,
        paymentLinkId: payload?.data?.object?.payment_link_id || payload?.data?.payment_link_id,
        amount,
        currency
    };
    await sql`
        INSERT INTO payment_events (provider, provider_event_id, payment_order_id, event_type, payload)
        VALUES (${provider}, ${String(providerEventId)}, ${order.id}, ${provider}, ${JSON.stringify(auditPayload)}::jsonb)
        ON CONFLICT (provider, provider_event_id) DO NOTHING`;

    if (order.status === 'paid') {
        return { matched: true, paid: true, duplicate: true, emailSent: await sendConfirmation(order) };
    }
    if (order.status !== 'pending' || new Date(order.expires_at).getTime() <= Date.now()) {
        return { matched: true, paid: false, reason: 'reservation_expired' };
    }

    const paidAt = new Date().toISOString();
    const rows = await sql`
        WITH paid_order AS (
            UPDATE payment_orders SET
                status = 'paid', paid_provider = ${provider}, paid_amount = ${Number(amount)},
                paid_currency = ${expectedCurrency}, provider_transaction_id = ${String(providerTransactionId || providerEventId)},
                paid_at = ${paidAt}, updated_at = NOW()
            WHERE id = ${order.id} AND status = 'pending' AND expires_at > NOW()
            RETURNING *
        ), paid_application AS (
            UPDATE applications a SET payment_status = 'paid', paid_at = ${paidAt}, status = 'approved'
            FROM paid_order po WHERE a.id = po.application_id RETURNING a.id
        ), paid_attendance AS (
            INSERT INTO event_attendance
                (event_id, member_id, application_id, ticket_type, payment_status,
                 approved_at, paid_at, seat_count, guest_name)
            SELECT po.event_id, po.member_id, po.application_id, 'dinner', 'paid',
                   ${paidAt}, ${paidAt}, po.ticket_count, a.guest_name
            FROM paid_order po
            JOIN applications a ON a.id = po.application_id
            ON CONFLICT (event_id, member_id) DO UPDATE SET
                payment_status = 'paid',
                paid_at = ${paidAt},
                seat_count = CASE
                    WHEN event_attendance.application_id = EXCLUDED.application_id THEN GREATEST(event_attendance.seat_count, EXCLUDED.seat_count)
                    ELSE LEAST(2, event_attendance.seat_count + EXCLUDED.seat_count)
                END,
                guest_name = COALESCE(event_attendance.guest_name, EXCLUDED.guest_name)
            RETURNING id
        ), activated_member AS (
            UPDATE members m SET account_status = 'active', is_approved = true,
                payment_access_expires_at = NULL, updated_at = NOW()
            FROM paid_order po WHERE m.id = po.member_id RETURNING m.id
        )
        SELECT po.* FROM paid_order po`;

    if (!rows[0]) return { matched: true, paid: false, reason: 'reservation_expired_or_processed' };
    order = { ...order, ...rows[0], status: 'paid', paid_at: paidAt };
    if (provider === 'sepay' && order.airwallex_link_id) {
        try {
            await deactivatePaymentLink(order.airwallex_link_id);
        } catch (error) {
            // Payment is already final in our database. Log for operations rather
            // than asking SePay to replay a successful bank transaction forever.
            console.error('[complete-payment] could not deactivate alternate Airwallex link:', error.message);
        }
    }
    return { matched: true, paid: true, emailSent: await sendConfirmation(order), orderId: order.id };
}

module.exports = { completePayment, findOrder, moneyEqual };
