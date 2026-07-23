const crypto = require('crypto');

const TEST_EVENT_SLUG = 'production-payment-test';
const TEST_AMOUNT_VND = 5000;
const MAX_TOKEN_LIFETIME_SECONDS = 60 * 60;

function configuredSecret() {
    return String(process.env.QUICK_RESERVATION_TEST_SECRET || '').trim();
}

function signature(payload, secret = configuredSecret()) {
    return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createTestToken({ now = Date.now(), lifetimeSeconds = 30 * 60, nonce } = {}) {
    const secret = configuredSecret();
    if (secret.length < 32) {
        throw new Error('QUICK_RESERVATION_TEST_SECRET must contain at least 32 characters.');
    }
    const lifetime = Math.min(Math.max(Number(lifetimeSeconds) || 1800, 60), MAX_TOKEN_LIFETIME_SECONDS);
    const expiresAt = Math.floor(now / 1000) + lifetime;
    const random = nonce || crypto.randomBytes(12).toString('base64url');
    const payload = `${expiresAt}.${random}`;
    return `${payload}.${signature(payload, secret)}`;
}

function verifyTestToken(token, { now = Date.now() } = {}) {
    const secret = configuredSecret();
    if (secret.length < 32 || !token) return false;
    const parts = String(token).split('.');
    if (parts.length !== 3) return false;
    const [expiresAtRaw, nonce, suppliedSignature] = parts;
    const expiresAt = Number(expiresAtRaw);
    const nowSeconds = Math.floor(now / 1000);
    if (!Number.isInteger(expiresAt) || !nonce || expiresAt <= nowSeconds || expiresAt > nowSeconds + MAX_TOKEN_LIFETIME_SECONDS) {
        return false;
    }
    const expectedSignature = signature(`${expiresAtRaw}.${nonce}`, secret);
    const supplied = Buffer.from(suppliedSignature);
    const expected = Buffer.from(expectedSignature);
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

module.exports = {
    TEST_EVENT_SLUG,
    TEST_AMOUNT_VND,
    MAX_TOKEN_LIFETIME_SECONDS,
    createTestToken,
    verifyTestToken
};
