// Airwallex webhook receiver — marks an application's seat as paid.
// Configure this URL in the Airwallex dashboard (Webhooks) and set AIRWALLEX_WEBHOOK_SECRET.
// On a successful payment event it sets payment_status='paid', paid_at=now — which the reminder
// scheduler uses to skip the seat (no more reminders / expiry).
//
// Signature: Airwallex signs with HMAC-SHA256 over (timestamp + rawBody) using the webhook secret,
// sent in the `x-signature` header with `x-timestamp`. Verification is enforced when the secret is set.

const crypto = require('crypto');
const { sql, isConfigured: dbConfigured } = require('./lib/neon');

const PAID_EVENTS = new Set([
    'payment_intent.succeeded',
    'payment_link.paid',
    'payment_attempt.authorized',
    'payment_intent.captured'
]);

function verifySignature(rawBody, headers) {
    const secret = process.env.AIRWALLEX_WEBHOOK_SECRET;
    if (!secret) {
        console.warn('[airwallex-webhook] AIRWALLEX_WEBHOOK_SECRET not set — skipping signature check.');
        return true; // allow through so the flow works before the secret is configured
    }
    const sig = headers['x-signature'] || headers['X-Signature'];
    const ts = headers['x-timestamp'] || headers['X-Timestamp'];
    if (!sig || !ts) return false;
    const expected = crypto.createHmac('sha256', secret).update(ts + rawBody).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch (e) {
        return false;
    }
}

// Try hard to find which application this payment belongs to.
function extractApplicationId(obj) {
    if (!obj) return null;
    if (obj.metadata && obj.metadata.application_id) return obj.metadata.application_id;
    // reference we set on the payment link was `app-<uuid>`
    const ref = obj.reference || (obj.metadata && obj.metadata.reference);
    if (ref && String(ref).startsWith('app-')) return String(ref).slice(4);
    return null;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const rawBody = event.body || '';
    if (!verifySignature(rawBody, event.headers || {})) {
        return { statusCode: 401, body: 'Invalid signature' };
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch (e) {
        return { statusCode: 400, body: 'Invalid JSON' };
    }

    const eventName = payload.name || payload.type || '';
    if (!PAID_EVENTS.has(eventName)) {
        return { statusCode: 200, body: `ignored: ${eventName}` };
    }

    const obj = (payload.data && (payload.data.object || payload.data)) || {};
    const appId = extractApplicationId(obj);
    const email = obj.metadata && obj.metadata.email;

    if (!appId && !email) {
        console.warn('[airwallex-webhook] could not resolve application from event', eventName);
        return { statusCode: 200, body: 'no application match' };
    }

    if (!dbConfigured()) {
        console.error('[airwallex-webhook] DATABASE_URL not set.');
        return { statusCode: 200, body: 'not configured' };
    }

    const paidAt = new Date().toISOString();
    let data;
    try {
        if (appId) {
            data = await sql`
                UPDATE applications
                SET payment_status = 'paid', paid_at = ${paidAt}, status = 'approved'
                WHERE id = ${appId}
                RETURNING id`;
        } else {
            data = await sql`
                UPDATE applications
                SET payment_status = 'paid', paid_at = ${paidAt}, status = 'approved'
                WHERE email = ${String(email).toLowerCase()}
                RETURNING id`;
        }
    } catch (error) {
        console.error('[airwallex-webhook] update error:', error);
        return { statusCode: 500, body: 'update error' };
    }

    console.log(`[airwallex-webhook] marked paid: ${appId || email} (${(data || []).length} row(s))`);
    return { statusCode: 200, body: 'ok' };
};
