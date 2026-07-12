// ============================================================
// POST /.netlify/functions/auth-logout
//
// Sessions are stateless JWTs, so "logout" is client-side (drop the stored
// token). This endpoint additionally clears the HttpOnly fvn_session cookie by
// expiring it, so a cookie-based session is also terminated.
// ============================================================

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

    const expired = [
        'fvn_session=',
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        'Max-Age=0'
    ].join('; ');

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...CORS, 'Set-Cookie': expired },
        body: JSON.stringify({ success: true })
    };
};
