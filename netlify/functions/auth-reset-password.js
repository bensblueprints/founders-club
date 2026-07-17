const crypto = require('crypto');
const { sql, isConfigured } = require('./lib/neon');
const { hashPassword, publicUser, signToken } = require('./lib/auth');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(statusCode, value, extraHeaders = {}) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', ...CORS, ...extraHeaders },
        body: JSON.stringify(value)
    };
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function isStrongPassword(password) {
    return password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.SESSION_SECRET) return json(500, { error: 'Server not configured (missing SESSION_SECRET).' });
    if (!isConfigured()) return json(503, { error: 'Database not configured' });

    let token, password;
    try {
        const body = JSON.parse(event.body || '{}');
        token = String(body.token || '');
        password = String(body.password || '');
    } catch (_) {
        return json(400, { error: 'Invalid JSON' });
    }

    if (!token) return json(400, { error: 'Reset token is required.' });
    if (!isStrongPassword(password)) {
        return json(400, { error: 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.' });
    }

    const resetRows = await sql`
        SELECT prt.id AS reset_id, prt.member_id, m.*
        FROM password_reset_tokens prt
        JOIN members m ON m.id = prt.member_id
        WHERE prt.token_hash = ${hashToken(token)}
          AND prt.used_at IS NULL
          AND prt.expires_at > NOW()
        LIMIT 1`;
    const reset = resetRows[0];
    if (!reset) return json(400, { error: 'This reset link is invalid or expired.' });
    if (reset.account_status === 'locked') {
        return json(423, { error: 'This account is locked. Please contact support@foundersvn.com.' });
    }

    const passwordHash = await hashPassword(password);
    const rows = await sql`
        UPDATE members
        SET password_hash = ${passwordHash},
            must_reset_password = false,
            updated_at = NOW()
        WHERE id = ${reset.member_id}
        RETURNING *`;
    await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${reset.reset_id}`;

    const user = publicUser(rows[0]);
    const sessionToken = signToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        is_admin: user.is_admin,
        account_status: user.account_status || 'active',
        must_reset_password: false
    });
    const cookie = `fvn_session=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
    return json(200, { success: true, token: sessionToken, user }, { 'Set-Cookie': cookie });
};
