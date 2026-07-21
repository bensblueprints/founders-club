const SUCCESS_OR_ACTIVITY = new Set(['delivered', 'opened', 'clicked']);

function normalizeResendStatus(status) {
    const value = String(status || '').replace(/^email\./, '');
    if (value === 'delivery_delayed') return 'delayed';
    return value || 'unknown';
}

function resendFailureReason(email, status) {
    const data = email?.data || email || {};
    const bounce = data.bounce || {};
    const diagnostics = Array.isArray(bounce.diagnosticCode)
        ? bounce.diagnosticCode.filter(Boolean).join('; ')
        : bounce.diagnosticCode;
    const message = bounce.message || data.failed?.reason || data.suppression?.reason
        || data.error?.message || (typeof data.error === 'string' ? data.error : null)
        || data.reason || null;
    if (message && diagnostics && !String(message).includes(String(diagnostics))) return `${message} (${diagnostics})`;
    if (message || diagnostics) return String(message || diagnostics);
    const labels = {
        bounced:'The recipient mail server rejected this email.',
        failed:'Resend could not send this email.',
        suppressed:'Resend suppressed delivery to this recipient.',
        complained:'The recipient marked this email as spam.',
        canceled:'This email was canceled before delivery.'
    };
    return labels[status] || null;
}

async function reconcileWebhookStatuses(rows, sql) {
    let reconciled;
    try {
        reconciled = await sql`WITH strongest_event AS (
        SELECT DISTINCT ON (provider_email_id) provider_email_id, event_type, received_at
        FROM email_webhook_events
        WHERE provider_email_id IS NOT NULL
        ORDER BY provider_email_id,
          CASE event_type
            WHEN 'email.bounced' THEN 90 WHEN 'email.failed' THEN 90
            WHEN 'email.suppressed' THEN 90 WHEN 'email.complained' THEN 90
            WHEN 'email.canceled' THEN 90 WHEN 'email.clicked' THEN 70
            WHEN 'email.opened' THEN 60 WHEN 'email.delivered' THEN 50
            WHEN 'email.delivery_delayed' THEN 30 WHEN 'email.sent' THEN 20 ELSE 10
          END DESC, received_at DESC
      )
      UPDATE email_deliveries ed SET
        status = CASE se.event_type
          WHEN 'email.delivery_delayed' THEN 'delayed'
          ELSE REPLACE(se.event_type, 'email.', '')
        END,
        updated_at = NOW()
      FROM strongest_event se
      WHERE ed.provider_email_id = se.provider_email_id
        AND ed.status IN ('queued', 'sent', 'delayed')
      RETURNING ed.provider_email_id, ed.status, ed.event_at, ed.error`;
    } catch (error) {
        console.error('[resend-status] could not reconcile webhook events:', error.message);
        return;
    }
    const byId = new Map((reconciled || []).filter(item => item.provider_email_id).map(item => [item.provider_email_id, item]));
    for (const row of rows) {
        const update = byId.get(row.latest_email_provider_id);
        if (!update) continue;
        row.latest_email_status = update.status;
        row.latest_email_event_at = update.event_at;
        row.latest_email_error = update.error;
    }
}

async function syncResendStatuses(rows, { sql, fetchImpl = global.fetch, apiKey = process.env.RESEND_API_KEY } = {}) {
    if (!Array.isArray(rows)) return rows;
    await reconcileWebhookStatuses(rows, sql);
    const failureStatuses = ['bounced', 'failed', 'suppressed', 'complained', 'canceled'];
    const pending = rows.filter(row => row.latest_email_provider_id && (
        ['queued', 'sent', 'delayed'].includes(row.latest_email_status)
        || (failureStatuses.includes(row.latest_email_status) && !row.latest_email_error)
    ));
    if (!pending.length) return rows;
    if (!apiKey || typeof fetchImpl !== 'function') {
        for (const row of pending) row.latest_email_sync_error = 'Resend status refresh is unavailable. Configure RESEND_API_KEY and the delivery webhook.';
        return rows;
    }
    await Promise.all(pending.slice(0, 25).map(async row => {
        try {
            const response = await fetchImpl(`https://api.resend.com/emails/${encodeURIComponent(row.latest_email_provider_id)}`, {
                headers: { Authorization: `Bearer ${apiKey}` }
            });
            if (!response.ok) {
                const details = await response.json().catch(() => ({}));
                const invalidKey = response.status === 400 && /api key is invalid/i.test(String(details.message || ''));
                row.latest_email_sync_error = invalidKey
                    ? 'RESEND_API_KEY is invalid. Use a Full access Resend API key beginning with re_, not the whsec_ webhook signing secret.'
                    : response.status === 401 || response.status === 403
                        ? 'RESEND_API_KEY can send email but cannot read delivery status. Give this key Full access in Resend.'
                        : `Resend status refresh failed with HTTP ${response.status}.`;
                return;
            }
            const email = await response.json();
            const status = normalizeResendStatus(email.last_event || email.data?.last_event);
            const failureReason = resendFailureReason(email, status);
            const needsFailureReason = Boolean(failureReason && !row.latest_email_error && !SUCCESS_OR_ACTIVITY.has(status));
            if (!status || (status === row.latest_email_status && !needsFailureReason)) return;
            await sql`UPDATE email_deliveries SET status = ${status}, event_at = NOW(),
                error = CASE
                    WHEN ${SUCCESS_OR_ACTIVITY.has(status)} THEN NULL
                    WHEN ${failureReason}::text IS NOT NULL THEN ${failureReason}::text
                    ELSE error
                END,
                updated_at = NOW() WHERE provider_email_id = ${row.latest_email_provider_id}`;
            row.latest_email_status = status;
            row.latest_email_event_at = new Date().toISOString();
            if (SUCCESS_OR_ACTIVITY.has(status)) row.latest_email_error = null;
            else if (failureReason) row.latest_email_error = failureReason;
        } catch (error) {
            console.error('[resend-status] could not refresh email:', error.message);
            row.latest_email_sync_error = 'Could not reach Resend to refresh delivery status.';
        }
    }));
    return rows;
}

module.exports = { normalizeResendStatus, resendFailureReason, reconcileWebhookStatuses, syncResendStatuses };
