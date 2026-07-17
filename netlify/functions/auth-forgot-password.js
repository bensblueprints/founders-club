const crypto = require('crypto');
const { sql, isConfigured } = require('./lib/neon');
const { sendEmail, passwordResetEmail } = require('./lib/emailer');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(statusCode, value) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', ...CORS },
        body: JSON.stringify(value)
    };
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function baseUrl() {
    return String(process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://foundersvn.com').replace(/\/+$/, '');
}

const GENERIC_RESPONSE = {
    success: true,
    message: 'If an account exists for that email, we sent password reset instructions.'
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!isConfigured()) return json(503, { error: 'Database not configured' });

    let email;
    try {
        email = String(JSON.parse(event.body || '{}').email || '').trim().toLowerCase();
    } catch (_) {
        return json(400, { error: 'Invalid JSON' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(400, { error: 'A valid email is required.' });
    }

    try {
        const rows = await sql`SELECT * FROM members WHERE LOWER(email) = ${email} LIMIT 1`;
        const member = rows[0];
        if (!member || !member.password_hash || member.account_status === 'locked') {
            return json(200, GENERIC_RESPONSE);
        }

        await sql`
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE member_id = ${member.id}
              AND used_at IS NULL`;

        const rawToken = crypto.randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await sql`
            INSERT INTO password_reset_tokens (member_id, token_hash, expires_at)
            VALUES (${member.id}, ${hashToken(rawToken)}, ${expiresAt.toISOString()})`;

        const resetUrl = `${baseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
        const emailContent = passwordResetEmail({
            firstName: member.first_name,
            resetUrl,
            expiresMinutes: 60
        });
        const sent = await sendEmail({
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
            tracking: { type: 'password_reset', memberId: member.id }
        });
        if (!sent.success) console.error('[auth-forgot-password] reset email failed:', sent.error);
    } catch (err) {
        console.error('[auth-forgot-password] failed:', err);
        // Keep the response generic so this endpoint cannot enumerate accounts.
    }

    return json(200, GENERIC_RESPONSE);
};
