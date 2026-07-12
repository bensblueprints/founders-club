// POST endpoint the landing "Apply" form submits to.
// Validates, inserts into Neon `applications` (status=pending), then emails organisers.
// CORS-open (mirrors send-welcome-email.js).

const { sql, isConfigured: dbConfigured } = require('./lib/neon');
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
    const email = String(body.email).trim().toLowerCase();

    if (!dbConfigured()) {
        // Without DATABASE_URL we cannot write. Report clearly but don't 500 vaguely.
        console.error('[submit-application] DATABASE_URL not set — cannot persist application.');
        return json(500, { error: 'Server not configured (missing DATABASE_URL).' });
    }

    // Upsert on email so a re-submission updates the existing pending row instead of 409-ing.
    let data;
    try {
        const rows = await sql`
            INSERT INTO applications
                (first_name, last_name, email, company, role, company_link, industry,
                 looking_for, can_offer, what_you_do, social_link, page_language,
                 event, event_interest, status, payment_status, reminders_sent)
            VALUES
                (${first}, ${last}, ${email}, ${body.company || null}, ${body.role || null},
                 ${body.company_link || null}, ${body.industry || null}, ${body.looking_for || null},
                 ${body.can_offer || null}, ${body.what_you_do || null}, ${body.links || null},
                 ${body.page_language || null}, ${body.event || null}, ${body.event || null},
                 'pending', NULL, '{}')
            ON CONFLICT (email) DO UPDATE SET
                first_name    = EXCLUDED.first_name,
                last_name     = EXCLUDED.last_name,
                company       = EXCLUDED.company,
                role          = EXCLUDED.role,
                company_link  = EXCLUDED.company_link,
                industry      = EXCLUDED.industry,
                looking_for   = EXCLUDED.looking_for,
                can_offer     = EXCLUDED.can_offer,
                what_you_do   = EXCLUDED.what_you_do,
                social_link   = EXCLUDED.social_link,
                page_language = EXCLUDED.page_language,
                event         = EXCLUDED.event,
                event_interest = EXCLUDED.event_interest
            RETURNING *`;
        data = rows[0];
    } catch (error) {
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
