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

function isHttpUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
    } catch (_) {
        return false;
    }
}

function isContactNumber(value) {
    const raw = String(value || '').trim();
    const digits = raw.replace(/\D/g, '');
    return /^\+?[0-9][0-9\s().-]{7,18}$/.test(raw) && digits.length >= 8 && digits.length <= 15;
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
        'name', 'email', 'company', 'role', 'event_slug', 'company_link',
        'industry', 'looking_for', 'can_offer', 'what_you_do', 'links', 'language'
    ];
    const missing = required.filter(f => !String(body[f] || '').trim());
    if (missing.length) {
        return json(400, { error: `Missing required field(s): ${missing.join(', ')}` });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
        return json(400, { error: 'Invalid email address' });
    }
    if (!isHttpUrl(body.company_link)) {
        return json(400, { error: 'Invalid company website or LinkedIn URL. Please include http:// or https://.' });
    }
    if (!isContactNumber(body.links)) {
        return json(400, { error: 'Invalid WhatsApp/Zalo number.' });
    }

    const { first, last } = splitName(body.name);
    const ticketCount = Number(body.ticket_count || 1);
    if (![1, 2].includes(ticketCount)) return json(400, { error: 'Ticket quantity must be 1 or 2.' });
    const guestName = String(body.guest_name || '').trim();
    if (ticketCount === 2 && !guestName) {
        return json(400, { error: 'Please enter your partner / co-founder name for the second ticket.' });
    }

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
                 looking_for, can_offer, what_you_do, social_link, page_language,
                 event, event_interest, ticket_count, guest_name, status, payment_status, reminders_sent)
            VALUES
                (${first}, ${last}, ${email}, ${selectedEvent.id}, ${body.company || null}, ${body.role || null},
                 ${body.company_link || null}, ${body.industry || null}, ${body.looking_for || null},
                 ${body.can_offer || null}, ${body.what_you_do || null}, ${body.links || null},
                 ${body.page_language || null}, ${selectedEvent.name}, ${selectedEvent.slug}, ${ticketCount}, ${guestName || null},
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
        const spokenLang = body.language ? ` (spoken: ${body.language})` : '';
        const tmpl = notificationEmail({ app: { ...data, page_language: (data.page_language || '') + spokenLang }, adminUrl: ADMIN_URL });
        await sendEmail({ to: NOTIFY_EMAILS, subject: tmpl.subject, html: tmpl.html });
    } catch (e) {
        console.error('[submit-application] notify email failed:', e);
    }

    return json(200, { success: true, id: data.id, eventId: selectedEvent.id, ticketCount });
};
