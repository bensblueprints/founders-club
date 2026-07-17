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

const ADMIN_URL = `${process.env.URL || 'https://foundersvn.com'}/admin`;

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

    // Required fields (match the public landing application form).
    const required = [
        'name', 'email', 'company_profile', 'role', 'event_slug',
        'what_you_do', 'why_join', 'whatsapp'
    ];
    const missing = required.filter(f => !String(body[f] || '').trim());
    if (missing.length) {
        return json(400, { error: `Missing required field(s): ${missing.join(', ')}` });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
        return json(400, { error: 'Invalid email address' });
    }
    if (!/^[+0-9() .-]{7,24}$/.test(String(body.whatsapp).trim())) {
        return json(400, { error: 'Invalid WhatsApp number' });
    }

    const { first, last } = splitName(body.name);
    const ticketCount = 1;
    const companyProfile = String(body.company_profile).trim();
    const companyLink = /^(https?:\/\/|www\.|linkedin\.com\/)/i.test(companyProfile) ? companyProfile : null;
    const whatsapp = String(body.whatsapp).trim();
    const socialLink = `WhatsApp: ${whatsapp}`;
    const whyJoin = String(body.why_join).trim();

    // Map the landing form's fields onto the applications table.
    const email = String(body.email).trim().toLowerCase();

    if (!dbConfigured()) {
        // Without DATABASE_URL we cannot write. Report clearly but don't 500 vaguely.
        console.error('[submit-application] DATABASE_URL not set — cannot persist application.');
        return json(500, { error: 'Server not configured (missing DATABASE_URL).' });
    }

    let selectedEvent;
    try {
        const events = await sql`
            SELECT id, slug, name, event_date, dinner_price
            FROM events
            WHERE slug = ${String(body.event_slug).trim().toLowerCase()}
              AND status IN ('open', 'upcoming')
            LIMIT 1`;
        selectedEvent = events[0];
    } catch (error) {
        console.error('[submit-application] event lookup error:', error);
        return json(500, { error: 'Could not load the selected event' });
    }
    if (!selectedEvent) return json(400, { error: 'The selected event is not open for applications.' });

    // A person may apply to several events, but only once per event. Re-submitting
    // updates an existing pending application without changing reviewed records.
    let data;
    try {
        const rows = await sql`
            INSERT INTO applications
                (first_name, last_name, email, event_id, company, role, company_link, industry,
                 looking_for, can_offer, what_you_do, social_link, page_language, why_join,
                 event, event_interest, ticket_count, guest_name, status, payment_status, reminders_sent)
            VALUES
                (${first}, ${last}, ${email}, ${selectedEvent.id}, ${companyProfile}, ${body.role || null},
                 ${companyLink}, NULL, ${whyJoin}, NULL, ${body.what_you_do || null}, ${socialLink},
                 ${body.page_language || null}, ${whyJoin}, ${selectedEvent.name}, ${selectedEvent.slug}, ${ticketCount}, NULL,
                 'pending', NULL, '{}')
            ON CONFLICT (event_id, LOWER(email)) DO UPDATE SET
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
                why_join      = EXCLUDED.why_join,
                event         = EXCLUDED.event,
                event_interest = EXCLUDED.event_interest,
                ticket_count   = EXCLUDED.ticket_count,
                guest_name     = EXCLUDED.guest_name
            WHERE applications.status = 'pending'
            RETURNING *`;
        data = rows[0];
    } catch (error) {
        console.error('[submit-application] insert error:', error);
        return json(500, { error: 'Could not save application', details: error.message });
    }
    if (!data) return json(409, { error: 'An application for this event has already been reviewed.' });

    // Notify organisers (best-effort — never fail the submission on email trouble).
    try {
        const tmpl = notificationEmail({ app: data, adminUrl: ADMIN_URL });
        await sendEmail({ to: NOTIFY_EMAILS, subject: tmpl.subject, html: tmpl.html });
    } catch (e) {
        console.error('[submit-application] notify email failed:', e);
    }

    return json(200, { success: true, id: data.id, eventId: selectedEvent.id, ticketCount });
};
