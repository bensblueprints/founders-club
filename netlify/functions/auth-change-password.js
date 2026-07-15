const { sql, isConfigured } = require('./lib/neon');
const { getBearerToken, verifyToken, hashPassword, publicUser, signToken } = require('./lib/auth');

const json = (statusCode, value) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!isConfigured()) return json(503, { error: 'Database not configured' });
    const claims = verifyToken(getBearerToken(event));
    if (!claims?.sub) return json(401, { error: 'Unauthorized' });
    let password;
    try { password = String(JSON.parse(event.body || '{}').password || ''); } catch (_) { return json(400, { error: 'Invalid JSON' }); }
    if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        return json(400, { error: 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.' });
    }
    const passwordHash = await hashPassword(password);
    const rows = await sql`
        UPDATE members SET password_hash = ${passwordHash}, must_reset_password = false, updated_at = NOW()
        WHERE id = ${claims.sub} AND account_status <> 'locked'
        RETURNING *`;
    if (!rows[0]) return json(423, { error: 'Account locked' });
    const user = publicUser(rows[0]);
    const token = signToken({
        sub: user.id, email: user.email, role: user.role, is_admin: user.is_admin,
        account_status: user.account_status || 'active', must_reset_password: false
    });
    const cookie = `fvn_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
        body: JSON.stringify({ success: true, token, user })
    };
};
