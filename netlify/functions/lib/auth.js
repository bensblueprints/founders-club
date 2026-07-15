// ============================================================
// FoundersVN — shared server-side auth helpers.
//
// Provides:
//   * hashPassword / checkPassword  — bcrypt (bcryptjs, pure JS, Netlify-safe)
//   * signToken / verifyToken       — stateless HS256 JWT via node:crypto HMAC
//                                     (no jsonwebtoken dependency)
//   * getBearerToken(event)         — pull a JWT from Authorization header / cookie
//   * isAdminRequest(event)         — true if the request carries EITHER a valid
//                                     admin JWT OR the shared ADMIN_TOKEN header
//   * publicUser(row)               — strip password_hash, shape the safe object
//
// The browser NEVER receives a password hash or the SESSION_SECRET. Tokens are
// signed server-side only; the client just stores and replays the opaque JWT.
// ============================================================

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ---- password hashing ------------------------------------------------------

async function hashPassword(plain) {
    if (typeof plain !== 'string' || plain.length === 0) {
        throw new Error('hashPassword: password must be a non-empty string');
    }
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function checkPassword(plain, hash) {
    if (typeof plain !== 'string' || typeof hash !== 'string' || !hash) return false;
    try {
        return await bcrypt.compare(plain, hash);
    } catch (_e) {
        return false;
    }
}

// Generate a strong, human-typeable temporary password (server-side only).
// Uses crypto randomness; mixes cases, digits and a few symbols. ~14 chars.
function generateTempPassword(length = 14) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const symbols = '!@#$%*?';
    const n = Math.max(10, length);
    const bytes = crypto.randomBytes(n + 2);
    let out = '';
    for (let i = 0; i < n; i++) {
        out += alphabet[bytes[i] % alphabet.length];
    }
    // Guarantee at least one digit and one symbol so it satisfies common policies.
    const digit = '23456789'[bytes[n] % 8];
    const sym = symbols[bytes[n + 1] % symbols.length];
    // Splice them in at deterministic-but-varied positions.
    const p1 = bytes[0] % out.length;
    const p2 = bytes[1] % out.length;
    out = out.slice(0, p1) + digit + out.slice(p1);
    out = out.slice(0, p2) + sym + out.slice(p2);
    return out;
}

// ---- base64url helpers -----------------------------------------------------

function b64url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function b64urlJSON(obj) {
    return b64url(JSON.stringify(obj));
}

function b64urlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Buffer.from(str, 'base64').toString('utf8');
}

// ---- JWT (HS256) -----------------------------------------------------------

function getSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
        throw new Error('SESSION_SECRET is not set — cannot sign/verify sessions.');
    }
    return secret;
}

function sign(data, secret) {
    return b64url(crypto.createHmac('sha256', secret).update(data).digest());
}

// signToken(payload, { expiresInSeconds })
// Adds iat + exp automatically (does not overwrite an explicit exp).
function signToken(payload, opts = {}) {
    const secret = getSecret();
    const ttl = opts.expiresInSeconds || DEFAULT_TTL_SECONDS;
    const nowSec = Math.floor(Date.now() / 1000);

    const header = { alg: 'HS256', typ: 'JWT' };
    const body = {
        ...payload,
        iat: payload.iat || nowSec,
        exp: payload.exp || (nowSec + ttl)
    };

    const encodedHeader = b64urlJSON(header);
    const encodedPayload = b64urlJSON(body);
    const signature = sign(`${encodedHeader}.${encodedPayload}`, secret);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// verifyToken(token) -> decoded payload object, or null if invalid/expired/tampered.
function verifyToken(token) {
    if (typeof token !== 'string' || !token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    let secret;
    try {
        secret = getSecret();
    } catch (_e) {
        return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expected = sign(`${encodedHeader}.${encodedPayload}`, secret);

    // Constant-time comparison — reject tampered signatures.
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
    }

    let payload;
    try {
        payload = JSON.parse(b64urlDecode(encodedPayload));
    } catch (_e) {
        return null;
    }

    // Expiry check.
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && nowSec >= payload.exp) return null;

    return payload;
}

// ---- request helpers -------------------------------------------------------

function headerValue(headers, name) {
    if (!headers) return undefined;
    // Netlify normalizes header names to lowercase, but be defensive.
    return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
}

// Extract a JWT from either `Authorization: Bearer <t>` or a `fvn_session` cookie.
function getBearerToken(event) {
    const headers = (event && event.headers) || {};
    const auth = headerValue(headers, 'authorization');
    if (auth && /^Bearer\s+/i.test(auth)) {
        return auth.replace(/^Bearer\s+/i, '').trim();
    }
    const cookie = headerValue(headers, 'cookie');
    if (cookie) {
        const m = cookie.match(/(?:^|;\s*)fvn_session=([^;]+)/);
        if (m) return decodeURIComponent(m[1]);
    }
    return null;
}

// True if the caller is authorized for admin-gated actions, via EITHER path:
//   1. a valid JWT whose is_admin === true, OR
//   2. the shared ADMIN_TOKEN header (backward-compat / server-to-server).
function isAdminRequest(event) {
    const headers = (event && event.headers) || {};

    // Path 1: admin JWT.
    const token = getBearerToken(event);
    if (token) {
        const payload = verifyToken(token);
        if (payload && payload.is_admin === true) return true;
    }

    // Path 2: shared secret (kept for backward compatibility).
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    if (ADMIN_TOKEN) {
        const provided = headerValue(headers, 'x-admin-token');
        if (provided && provided === ADMIN_TOKEN) return true;
    }

    return false;
}

// ---- safe user shaping -----------------------------------------------------

// Build the browser-safe user object from a members row. NEVER includes
// password_hash. Keeps every profile field (so profile.html can populate its
// form from the cached user) and adds the camelCase aliases + derived
// `memberType` the existing client code (admin.js / members.js / profile.html)
// already reads.
function publicUser(row) {
    if (!row) return null;

    // Copy the row, then strip anything sensitive.
    const safe = { ...row };
    delete safe.password_hash;

    const memberType = row.member_type || (row.is_admin ? 'admin' : 'member');

    return {
        ...safe,
        // camelCase aliases the client expects
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        memberType,
        member_type: memberType,
        is_admin: row.is_admin === true,
        mustResetPassword: row.must_reset_password === true,
        must_reset_password: row.must_reset_password === true,
        accountStatus: row.account_status || 'active',
        account_status: row.account_status || 'active'
    };
}

module.exports = {
    hashPassword,
    checkPassword,
    generateTempPassword,
    signToken,
    verifyToken,
    getBearerToken,
    isAdminRequest,
    publicUser,
    DEFAULT_TTL_SECONDS,
    BCRYPT_ROUNDS
};
