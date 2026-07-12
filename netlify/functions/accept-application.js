// Admin-only: accept an application, create a $150 Airwallex payment link, email it to the applicant.
// Auth: requires the `x-admin-token` header to equal process.env.ADMIN_TOKEN.
// (admin.js authenticates purely client-side via localStorage roles — there is no server-verifiable
//  session — so this endpoint gates on a shared ADMIN_TOKEN the admin UI sends in the header.)

const { getServiceClient, isConfigured: supaConfigured } = require('./lib/supabase');
const { createPaymentLink } = require('./lib/airwallex');
const { sendEmail, acceptedEmail, EVENT_DETAILS } = require('./lib/emailer');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function json(statusCode, obj) {
    return { statusCode, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    // --- Auth ---
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    if (!ADMIN_TOKEN) {
        return json(500, { error: 'Server not configured (missing ADMIN_TOKEN).' });
    }
    const provided = event.headers['x-admin-token'] || event.headers['X-Admin-Token'];
    if (provided !== ADMIN_TOKEN) {
        return json(401, { error: 'Unauthorized' });
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return json(400, { error: 'Invalid JSON body' });
    }

    const id = body.id;
    if (!id) return json(400, { error: 'Missing application id' });

    if (!supaConfigured()) {
        return json(500, { error: 'Server not configured (missing SUPABASE_SERVICE_ROLE_KEY).' });
    }
    const supabase = getServiceClient();

    // Load the application.
    const { data: app, error: loadErr } = await supabase
        .from('applications').select('*').eq('id', id).single();
    if (loadErr || !app) {
        return json(404, { error: 'Application not found' });
    }
    if (app.status === 'approved' && app.payment_link) {
        // Idempotent: already accepted — just return the existing link.
        return json(200, { success: true, paymentLink: app.payment_link, alreadyAccepted: true });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SEVEN_DAYS_MS);

    // Create the Airwallex payment link ($150 USD).
    let link;
    try {
        link = await createPaymentLink({
            amount: 150,
            currency: 'USD',
            title: 'FoundersVN — Da Nang, Jul 31 2026',
            description: `Seat confirmation for ${app.first_name || ''} ${app.last_name || ''}`.trim(),
            reference: `app-${id}`,
            metadata: { application_id: id, email: app.email },
            expiresAt: expiresAt.toISOString()
        });
    } catch (e) {
        console.error('[accept-application] payment link error:', e);
        return json(502, { error: 'Failed to create payment link', details: e.message });
    }

    // Persist approval + payment state.
    const { data: updated, error: updErr } = await supabase
        .from('applications')
        .update({
            status: 'approved',
            accepted_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            payment_status: 'awaiting',
            payment_link: link.url,
            reviewed_at: now.toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (updErr) {
        console.error('[accept-application] update error:', updErr);
        return json(500, { error: 'Could not update application', details: updErr.message });
    }

    // Email the applicant their payment link + event details.
    let emailResult = { success: false };
    try {
        const tmpl = acceptedEmail({ firstName: app.first_name, payLink: link.url });
        emailResult = await sendEmail({ to: app.email, subject: tmpl.subject, html: tmpl.html });
    } catch (e) {
        console.error('[accept-application] applicant email failed:', e);
    }

    return json(200, {
        success: true,
        paymentLink: link.url,
        expiresAt: expiresAt.toISOString(),
        emailSent: emailResult.success,
        emailMock: Boolean(emailResult.mock),
        paymentMock: Boolean(link.mock),
        event: EVENT_DETAILS
    });
};
