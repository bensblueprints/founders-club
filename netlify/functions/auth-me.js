// ============================================================
// GET/POST /.netlify/functions/auth-me
//
// Verifies the JWT (Authorization: Bearer <token>, or the fvn_session cookie)
// and returns the CURRENT, FRESH user from Neon (never the hash). Page-load
// guards call this to confirm a session is still valid server-side.
//
// 200 { user }            — valid session
// 401 { error, valid:false } — no/expired/tampered token
// ============================================================

const { sql, isConfigured } = require('./lib/neon');
const { verifyToken, getBearerToken, publicUser } = require('./lib/auth');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function json(statusCode, obj) {
    return { statusCode, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

    const token = getBearerToken(event);
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
        return json(401, { error: 'Not authenticated', valid: false });
    }

    // Stateless: a valid signature + unexpired token IS the session. If the DB is
    // reachable we refresh the profile; otherwise we fall back to the token claims.
    if (!isConfigured()) {
        return json(200, {
            valid: true,
            user: { id: payload.sub, email: payload.email, role: payload.role, is_admin: payload.is_admin === true }
        });
    }

    try {
        const rows = await sql`SELECT * FROM members WHERE id = ${payload.sub} LIMIT 1`;
        const row = rows[0];
        if (!row) {
            // Member was deleted after the token was issued.
            return json(401, { error: 'Account no longer exists', valid: false });
        }
        return json(200, { valid: true, user: publicUser(row) });
    } catch (e) {
        console.error('[auth-me] lookup failed:', e);
        return json(500, { error: 'Lookup failed', details: e.message });
    }
};
