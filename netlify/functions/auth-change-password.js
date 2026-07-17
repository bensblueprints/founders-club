const { sql, isConfigured } = require('./lib/neon');
const { getBearerToken, verifyToken, hashPassword, checkPassword, publicUser, signToken } = require('./lib/auth');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (statusCode, value, extraHeaders = {}) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extraHeaders },
    body: JSON.stringify(value)
});

function isStrongPassword(password) {
    return password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.SESSION_SECRET) return json(500, { error: 'Server not configured (missing SESSION_SECRET).' });
    if (!isConfigured()) return json(503, { error: 'Database not configured' });
    const claims = verifyToken(getBearerToken(event));
    if (!claims?.sub) return json(401, { error: 'Unauthorized' });
    let password, currentPassword;
    try {
        const body = JSON.parse(event.body || '{}');
        password = String(body.password || '');
        currentPassword = String(body.currentPassword || '');
    } catch (_) { return json(400, { error: 'Invalid JSON' }); }
    if (!isStrongPassword(password)) {
        return json(400, { error: 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.' });
    }
    const existingRows = await sql`SELECT * FROM members WHERE id = ${claims.sub} LIMIT 1`;
    const existing = existingRows[0];
    if (!existing || existing.account_status === 'locked') return json(423, { error: 'Account locked' });

    const mustReset = existing.must_reset_password === true || claims.must_reset_password === true;
    if (!mustReset) {
        if (!currentPassword) return json(400, { error: 'Current password is required.' });
        const ok = await checkPassword(currentPassword, existing.password_hash);
        if (!ok) return json(401, { error: 'Current password is incorrect.' });
    }

    const passwordHash = await hashPassword(password);
    const rows = await sql`
        UPDATE members SET password_hash = ${passwordHash}, must_reset_password = false, updated_at = NOW()
        WHERE id = ${claims.sub}
        RETURNING *`;
    if (!rows[0]) return json(423, { error: 'Account locked' });
    const user = publicUser(rows[0]);
    const token = signToken({
        sub: user.id, email: user.email, role: user.role, is_admin: user.is_admin,
        account_status: user.account_status || 'active', must_reset_password: false
    });
    const cookie = `fvn_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
    return json(200, { success: true, token, user }, { 'Set-Cookie': cookie });
};
