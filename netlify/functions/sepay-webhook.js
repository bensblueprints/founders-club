const { isConfigured } = require('./lib/neon');
const { verifyWebhook, extractPaymentCode, matchesConfiguredAccount } = require('./lib/sepay');
const { completePayment } = require('./lib/complete-payment');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ success: false }) };
    const rawBody = event.body || '';
    if (!verifyWebhook(rawBody, event.headers)) {
        return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Invalid signature' }) };
    }
    if (!isConfigured()) return { statusCode: 503, body: JSON.stringify({ success: false }) };

    let payload;
    try { payload = JSON.parse(rawBody); } catch (_) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Invalid JSON' }) };
    }

    const paymentCode = extractPaymentCode(payload);
    if (payload.transferType !== 'in' || !payload.id || !paymentCode ||
        !matchesConfiguredAccount(payload)) {
        const reason = payload.transferType !== 'in' ? 'not_incoming' :
            !payload.id ? 'missing_transaction_id' :
            !paymentCode ? 'missing_payment_code' : 'account_mismatch';
        console.warn(`[sepay-webhook] transaction was authenticated but not eligible: ${reason}`);
        return { statusCode: 200, body: JSON.stringify({ success: true, matched: false, reason }) };
    }

    const result = await completePayment({
        provider: 'sepay',
        providerEventId: String(payload.id),
        providerTransactionId: payload.referenceCode || String(payload.id),
        sepayCode: paymentCode,
        amount: payload.transferAmount,
        currency: 'VND',
        payload
    });

    if (result.paid && !result.emailSent) {
        return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Email retry required' }) };
    }
    if (!result.paid) console.warn(`[sepay-webhook] transaction did not settle an order: ${result.reason || 'unknown'}`);
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, matched: Boolean(result.matched), paid: Boolean(result.paid), reason: result.reason || null })
    };
};
