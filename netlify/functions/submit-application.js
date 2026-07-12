// POST endpoint the landing "Apply" form submits to.
// Validates, inserts into Supabase `applications` (status=pending), then emails organisers.
// CORS-open (mirrors send-welcome-email.js).

const { getServiceClient, isConfigured: supaConfigured } = require('./lib/supabase');
const { sendEmail, notificationEmail } = require('./lib/emailer');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const NOTIFY_EMAILS = (process.env.NOTIFY_EMAILS || 'ben@advancedmarketing.co')
    .split(',').map(s => s.trim()).filter(Boolean);

const ADMIN_URL = `${process.env.URL || 'https://foundersvn.com'}/admin.html`;

// Split a single "Full name" field into first/last to satisfy the NOT NULL columns.
function splitName(name) {
    const parts = (name || '').trim().split(/\s+/);
    const first = parts.shift() || '';
    const last = parts.join(' ') || '-';
    return { first, last };
}

function json(statusCode, obj) {
    return { statusCode, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return json(400, { error: 'Invalid JSON body' });
    }

    // Required fields (match the form's `required` inputs)
    const required = ['name', 'email', 'company', 'role'];
    const missing = required.filter(f => !String(body[f] || '').trim());
    if (missing.length) {
        return json(400, { error: `Missing required field(s): ${missing.join(', ')}` });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
        return json(400, { error: 'Invalid email address' });
    }

    const { first, last } = splitName(body.name);

    // Map the landing form's fields onto the applications table.
    const record = {
        first_name: first,
        last_name: last,
        email: String(body.email).trim().toLowerCase(),
        company: body.company || null,
        role: body.role || null,
        company_link: body.company_link || null,
        industry: body.industry || null,           // comma-joined chip labels
        looking_for: body.looking_for || null,      // comma-joined chip labels
        can_offer: body.can_offer || null,          // comma-joined chip labels
        what_you_do: body.what_you_do || null,
        social_link: body.links || null,            // "Your links" -> existing social_link col
        page_language: body.page_language || null,
        event: body.event || null,
        event_interest: body.event || null,         // keep legacy col populated too
        status: 'pending',
        payment_status: null,
        reminders_sent: []
    };

    if (!supaConfigured()) {
        // Without the service role key we cannot write. Report clearly but don't 500 the user.
        console.error('[submit-application] SUPABASE_SERVICE_ROLE_KEY not set — cannot persist application.');
        return json(500, { error: 'Server not configured (missing SUPABASE_SERVICE_ROLE_KEY).' });
    }

    const supabase = getServiceClient();

    // Upsert on email so a re-submission updates the existing pending row instead of 409-ing.
    const { data, error } = await supabase
        .from('applications')
        .upsert(record, { onConflict: 'email' })
        .select()
        .single();

    if (error) {
        console.error('[submit-application] insert error:', error);
        return json(500, { error: 'Could not save application', details: error.message });
    }

    // Notify organisers (best-effort — never fail the submission on email trouble).
    try {
        const spokenLang = body.language ? ` (spoken: ${body.language})` : '';
        const tmpl = notificationEmail({ app: { ...data, page_language: (data.page_language || '') + spokenLang }, adminUrl: ADMIN_URL });
        await sendEmail({ to: NOTIFY_EMAILS, subject: tmpl.subject, html: tmpl.html });
    } catch (e) {
        console.error('[submit-application] notify email failed:', e);
    }

    return json(200, { success: true, id: data.id });
};
