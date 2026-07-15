const crypto = require('crypto');
const { isConfigured } = require('./lib/neon');
const { completePayment } = require('./lib/complete-payment');
const { config: airwallexConfig } = require('./lib/airwallex');

const PAID_EVENTS = new Set(['payment_intent.succeeded']);

function verifySignature(rawBody, headers = {}) {
    const secret = airwallexConfig().webhookSecret;
    if (!secret) return false;
    const signature = headers['x-signature'] || headers['X-Signature'] || '';
    const timestamp = String(headers['x-timestamp'] || headers['X-Timestamp'] || '');
    const timestampMs = Number(timestamp);
    if (!timestampMs || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}${rawBody}`).digest('hex');
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function references(object = {}) {
    const metadata = object.metadata || {};
    const ref = String(object.reference || object.merchant_order_id || '');
    const uuidReference = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref) ? ref : null;
    return {
        orderId: metadata.payment_order_id || (ref.startsWith('order-') ? ref.slice(6) : uuidReference),
        applicationId: metadata.application_id || (ref.startsWith('app-') ? ref.slice(4) : null)
    };
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
    const rawBody = event.body || '';
    if (!verifySignature(rawBody, event.headers)) return { statusCode: 401, body: 'Invalid signature' };
    if (!isConfigured()) return { statusCode: 503, body: 'Database not configured' };

    let payload;
    try { payload = JSON.parse(rawBody); } catch (_) { return { statusCode: 400, body: 'Invalid JSON' }; }
    if (!PAID_EVENTS.has(payload.name || payload.type)) return { statusCode: 200, body: 'ignored' };

    const object = payload.data?.object || payload.data || {};
    const refs = references(object);
    const result = await completePayment({
        provider: 'airwallex',
        providerEventId: payload.id || `${payload.name}:${object.id}`,
        providerTransactionId: object.latest_successful_payment_intent_id || object.id,
        orderId: refs.orderId,
        applicationId: refs.applicationId,
        airwallexLinkId: object.payment_link_id || object.payment_link?.id || null,
        amount: object.amount,
        currency: object.currency,
        payload
    });

    if (!result.matched) return { statusCode: 200, body: 'no matching order' };
    if (!result.paid) return { statusCode: 200, body: result.reason || 'not processed' };
    if (!result.emailSent) return { statusCode: 500, body: 'payment saved; confirmation email retry required' };
    return { statusCode: 200, body: 'ok' };
};

exports._verifySignature = verifySignature;
