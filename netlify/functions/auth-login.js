// ============================================================
// POST /.netlify/functions/auth-login   { email, password }
//
// Server-verified login. Looks up the member in Neon by (lower-cased) email,
// verifies the password against members.password_hash with bcrypt, and — on
// success — issues a signed HS256 JWT (SESSION_SECRET) plus a browser-safe user
// object (NEVER the hash).
//
// Failures return a generic "Invalid email or password" (same message + status
// whether the email is unknown or the password is wrong) so the endpoint does
// not reveal which accounts exist.
// ============================================================

const { sql, isConfigured } = require('./lib/neon');
const { checkPassword, signToken, publicUser } = require('./lib/auth');
const { expireOverdueReservations } = require('./lib/expire-reservations');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(statusCode, obj, extraHeaders = {}) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', ...CORS, ...extraHeaders },
        body: JSON.stringify(obj)
    };
}

const GENERIC_401 = { error: 'Invalid email or password' };

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    if (!process.env.SESSION_SECRET) {
        return json(500, { error: 'Server not configured (missing SESSION_SECRET).' });
    }
    if (!isConfigured()) {
        return json(503, { error: 'Database not configured (missing DATABASE_URL).', notConfigured: true });
    }

    let email, password;
    try {
        const body = JSON.parse(event.body || '{}');
        email = String(body.email || '').trim().toLowerCase();
        password = String(body.password || '');
    } catch (e) {
        return json(400, { error: 'Invalid JSON body' });
    }

    if (!email || !password) {
        return json(400, { error: 'Email and password are required' });
    }

    let row;
    try {
        await expireOverdueReservations(sql);
        const rows = await sql`
            SELECT * FROM members WHERE LOWER(email) = ${email} LIMIT 1`;
        row = rows[0];
    } catch (e) {
        console.error('[auth-login] lookup failed:', e);
        return json(500, { error: 'Login failed', details: e.message });
    }

    // Generic failure whether the account is missing or has no usable hash.
    if (!row || !row.password_hash) {
        return json(401, GENERIC_401);
    }

    if (row.account_status === 'locked') {
        return json(423, { error: 'This account is locked because the payment window expired.' });
    }

    const ok = await checkPassword(password, row.password_hash);
    if (!ok) {
        return json(401, GENERIC_401);
    }

    try {
        const updated = await sql`
            UPDATE members
            SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1, updated_at = NOW()
            WHERE id = ${row.id}
            RETURNING *`;
        row = updated[0] || { ...row, last_login_at: new Date().toISOString(), login_count: Number(row.login_count || 0) + 1 };
    } catch (error) {
        console.error('[auth-login] tracking update failed:', error.message);
    }

    const user = publicUser(row);
    const token = signToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        is_admin: user.is_admin,
        account_status: user.account_status || 'active',
        must_reset_password: user.must_reset_password === true
    });

    // Also set an HttpOnly cookie so server-side guards (auth-me) work even if the
    // client only stored the token in localStorage. SameSite=Lax, 7 days.
    const cookie = [
        `fvn_session=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        `Max-Age=${7 * 24 * 60 * 60}`
    ].join('; ');

    return json(200, { token, user }, { 'Set-Cookie': cookie });
};
