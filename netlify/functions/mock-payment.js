// Local/test-only helper so the mock Airwallex button can exercise the same
// idempotent completion path as a signed production webhook.

const crypto = require('crypto');
const { getBearerToken, verifyToken } = require('./lib/auth');
const { findOrder, completePayment } = require('./lib/complete-payment');
const { isMockPayments } = require('./lib/payment-environment');

const json = (statusCode, value) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });

exports.handler = async (event) => {
    if (!isMockPayments()) return json(404, { error: 'Not found' });
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const claims = verifyToken(getBearerToken(event));
    if (!claims?.sub) return json(401, { error: 'Unauthorized' });
    let orderId;
    try { orderId = JSON.parse(event.body || '{}').orderId; } catch (_) { return json(400, { error: 'Invalid JSON' }); }
    const order = await findOrder({ orderId });
    if (!order || String(order.member_id) !== String(claims.sub)) return json(404, { error: 'Payment order not found' });
    const result = await completePayment({
        provider: 'airwallex',
        providerEventId: `mock-${crypto.randomUUID()}`,
        providerTransactionId: `mock-${Date.now()}`,
        orderId,
        amount: order.airwallex_total_usd,
        currency: 'USD',
        payload: { mock: true }
    });
    return json(result.paid ? 200 : 409, result);
};
