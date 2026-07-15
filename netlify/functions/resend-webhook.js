const { Webhook } = require('svix');
const { sql, isConfigured } = require('./lib/neon');

const statusFor = type => ({
    'email.sent': 'sent', 'email.delivered': 'delivered', 'email.delivery_delayed': 'delayed',
    'email.bounced': 'bounced', 'email.failed': 'failed', 'email.complained': 'complained',
    'email.opened': 'opened', 'email.clicked': 'clicked'
})[type] || String(type || '').replace(/^email\./, '') || 'unknown';

exports.handler = async event => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
    if (!isConfigured()) return { statusCode: 503, body: 'Database not configured' };
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return { statusCode: 503, body: 'RESEND_WEBHOOK_SECRET not configured' };
    let payload;
    try {
        payload = new Webhook(secret).verify(event.body || '', {
            'svix-id': event.headers?.['svix-id'] || event.headers?.['Svix-Id'],
            'svix-timestamp': event.headers?.['svix-timestamp'] || event.headers?.['Svix-Timestamp'],
            'svix-signature': event.headers?.['svix-signature'] || event.headers?.['Svix-Signature']
        });
    } catch (_) {
        return { statusCode: 400, body: 'Invalid webhook signature' };
    }
    const svixId = event.headers?.['svix-id'] || event.headers?.['Svix-Id'];
    const emailId = payload?.data?.email_id;
    if (!svixId || !emailId) return { statusCode: 400, body: 'Missing event identifiers' };
    const error = payload?.data?.bounce?.message || payload?.data?.reason || null;
    await sql`WITH recorded AS (
        INSERT INTO email_webhook_events (svix_id, provider_email_id, event_type)
        VALUES (${svixId}, ${emailId}, ${payload.type})
        ON CONFLICT (svix_id) DO NOTHING RETURNING svix_id
      )
      UPDATE email_deliveries SET status = ${statusFor(payload.type)},
        event_at = ${payload.created_at || new Date().toISOString()}, error = ${error}, updated_at = NOW()
      WHERE provider_email_id = ${emailId} AND EXISTS (SELECT 1 FROM recorded)`;
    return { statusCode: 200, body: 'ok' };
};

exports._statusFor = statusFor;
