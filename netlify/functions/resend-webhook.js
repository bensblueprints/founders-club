const { Webhook } = require('svix');
const { sql, isConfigured } = require('./lib/neon');

const statusFor = type => ({
    'email.sent': 'sent', 'email.delivered': 'delivered', 'email.delivery_delayed': 'delayed',
    'email.bounced': 'bounced', 'email.failed': 'failed', 'email.complained': 'complained',
    'email.opened': 'opened', 'email.clicked': 'clicked', 'email.suppressed': 'suppressed',
    'email.canceled': 'canceled'
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
    const error = payload?.data?.bounce?.message || payload?.data?.bounce?.type
        || payload?.data?.suppression?.reason || payload?.data?.failed?.reason
        || payload?.data?.reason || payload?.data?.error?.message || payload?.data?.error || null;
    const status = statusFor(payload.type);
    const eventAt = payload.created_at || new Date().toISOString();
    const recipient = Array.isArray(payload?.data?.to) ? payload.data.to.join(', ') : String(payload?.data?.to || 'unknown');
    const subject = String(payload?.data?.subject || 'Resend email event');
    await sql`WITH recorded AS (
        INSERT INTO email_webhook_events (svix_id, provider_email_id, event_type)
        VALUES (${svixId}, ${emailId}, ${payload.type})
        ON CONFLICT (svix_id) DO NOTHING RETURNING svix_id
      )
      INSERT INTO email_deliveries
        (provider_email_id, recipient, subject, email_type, status, event_at, error, metadata)
      SELECT ${emailId}, ${recipient}, ${subject}, 'resend_webhook', ${status}, ${eventAt}, ${error},
             ${JSON.stringify({ webhookEvent: payload.type })}::jsonb
      FROM recorded
      ON CONFLICT (provider_email_id) DO UPDATE SET
        status = CASE
          WHEN email_deliveries.status IN ('queued', 'sent', 'delayed')
            OR EXCLUDED.event_at >= email_deliveries.event_at
          THEN EXCLUDED.status ELSE email_deliveries.status END,
        event_at = GREATEST(email_deliveries.event_at, EXCLUDED.event_at),
        error = CASE
          WHEN email_deliveries.status IN ('queued', 'sent', 'delayed')
            OR EXCLUDED.event_at >= email_deliveries.event_at
          THEN EXCLUDED.error ELSE email_deliveries.error END,
        metadata = email_deliveries.metadata || EXCLUDED.metadata,
        updated_at = NOW()`;
    return { statusCode: 200, body: 'ok' };
};

exports._statusFor = statusFor;
