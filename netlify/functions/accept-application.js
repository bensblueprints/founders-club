// Admin-only: accept an application, create a $150 Airwallex payment link, email it to the applicant.
// Auth: requires the `x-admin-token` header to equal process.env.ADMIN_TOKEN.
// (admin.js authenticates purely client-side via localStorage roles — there is no server-verifiable
//  session — so this endpoint gates on a shared ADMIN_TOKEN the admin UI sends in the header.)

const { sql, isConfigured: dbConfigured } = require('./lib/neon');
const { createPaymentLink } = require('./lib/airwallex');
const { sendEmail, approvedWithLoginEmail, EVENT_DETAILS } = require('./lib/emailer');
const { isAdminRequest, hashPassword, generateTempPassword } = require('./lib/auth');

const LOGIN_URL = `${process.env.URL || 'https://foundersvn.com'}/login.html`;

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function json(statusCode, obj) {
    return { statusCode, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    // --- Auth: a valid admin JWT OR the shared ADMIN_TOKEN header (backward compat). ---
    if (!isAdminRequest(event)) {
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

    if (!dbConfigured()) {
        return json(500, { error: 'Server not configured (missing DATABASE_URL).' });
    }

    // Load the application.
    let app;
    try {
        const rows = await sql`SELECT * FROM applications WHERE id = ${id} LIMIT 1`;
        app = rows[0];
    } catch (e) {
        console.error('[accept-application] load error:', e);
        return json(500, { error: 'Could not load application', details: e.message });
    }
    if (!app) {
        return json(404, { error: 'Application not found' });
    }
    if (app.status === 'approved' && app.payment_link) {
        // Idempotent: already accepted — just return the existing link.
        return json(200, { success: true, paymentLink: app.payment_link, alreadyAccepted: true });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SEVEN_DAYS_MS);

    // Create the real LOGIN for this applicant FIRST. Approval — NOT payment — is
    // what grants membership, so this must never be blocked by the payment
    // processor. Generate a strong temp password, bcrypt-hash it server-side
    // (browser never sees the hash), upsert the member as approved
    // (is_approved = true) with must_reset_password = true, copying profile fields.
    const email = String(app.email || '').trim().toLowerCase();
    const tempPassword = generateTempPassword();
    let member = null;
    try {
        const passwordHash = await hashPassword(tempPassword);
        const rows = await sql`
            INSERT INTO members
                (email, first_name, last_name, company, role, industry,
                 is_approved, password_hash, must_reset_password)
            VALUES
                (${email}, ${app.first_name || ''}, ${app.last_name || '-'},
                 ${app.company || null}, ${app.role || null}, ${app.industry || null},
                 true, ${passwordHash}, true)
            ON CONFLICT (email) DO UPDATE SET
                is_approved         = true,
                password_hash       = EXCLUDED.password_hash,
                must_reset_password = true,
                first_name          = COALESCE(NULLIF(members.first_name, ''), EXCLUDED.first_name),
                last_name           = COALESCE(NULLIF(members.last_name, ''), EXCLUDED.last_name),
                company             = COALESCE(members.company, EXCLUDED.company),
                role                = COALESCE(members.role, EXCLUDED.role),
                industry            = COALESCE(members.industry, EXCLUDED.industry),
                updated_at          = NOW()
            RETURNING *`;
        member = rows[0] || null;
    } catch (memErr) {
        console.error('[accept-application] member create/approve error:', memErr);
        return json(500, { error: 'Could not create the member login', details: memErr.message });
    }

    // Now (best-effort) create the $150 Airwallex seat-payment link. If Airwallex
    // is misconfigured or down, the applicant is STILL an approved member with a
    // login — we just approve without a pay link and log the failure.
    let link = null;
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
        console.error('[accept-application] payment link error (non-fatal):', e.message);
    }

    // Persist approval + payment state (payment_link may be null if Airwallex failed).
    try {
        await sql`
            UPDATE applications SET
                status = 'approved',
                accepted_at = ${now.toISOString()},
                expires_at = ${expiresAt.toISOString()},
                payment_status = ${link ? 'awaiting' : 'no_link'},
                payment_link = ${link ? link.url : null},
                reviewed_at = ${now.toISOString()}
            WHERE id = ${id}`;
    } catch (updErr) {
        console.error('[accept-application] update error:', updErr);
        // Member login already created — don't fail the whole request over the app row.
    }

    // Email the applicant: login credentials + (if available) the $150 seat payment link.
    let emailResult = { success: false };
    try {
        const tmpl = approvedWithLoginEmail({
            firstName: app.first_name,
            email,
            tempPassword,
            loginUrl: LOGIN_URL,
            payLink: link ? link.url : null
        });
        emailResult = await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html });
    } catch (e) {
        console.error('[accept-application] applicant email failed:', e);
    }

    // Return the temp password so the admin UI can show it as a fallback if the
    // email did not send. (Safe: this endpoint is admin-gated.)
    return json(200, {
        success: true,
        paymentLink: link ? link.url : null,
        paymentLinkFailed: !link,
        expiresAt: expiresAt.toISOString(),
        tempPassword,
        loginUrl: LOGIN_URL,
        member: member ? {
            id: member.id,
            email: member.email,
            firstName: member.first_name,
            lastName: member.last_name,
            is_approved: member.is_approved
        } : null,
        emailSent: emailResult.success,
        emailMock: Boolean(emailResult.mock),
        paymentMock: Boolean(link && link.mock),
        event: EVENT_DETAILS
    });
};
