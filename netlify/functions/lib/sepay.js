const crypto = require('crypto');
const { paymentEnvironment, isMockPayments } = require('./payment-environment');

function config() {
    return {
        environment: paymentEnvironment(),
        bank: process.env.SEPAY_BANK || '',
        account: process.env.SEPAY_ACCOUNT_NUMBER || '',
        accountName: process.env.SEPAY_ACCOUNT_NAME || '',
        webhookSecret: process.env.SEPAY_WEBHOOK_SECRET || ''
    };
}

function isConfigured() {
    if (isMockPayments()) return true;
    const c = config();
    return Boolean(c.bank && c.account && c.webhookSecret);
}

function createPaymentCode(orderId) {
    return `FVN${String(orderId).replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function qrUrl({ amountVnd, code }) {
    const c = config();
    if (!c.bank || !c.account) return null;
    const params = new URLSearchParams({
        acc: c.account,
        bank: c.bank,
        amount: String(Math.round(amountVnd)),
        des: code
    });
    return `https://vietqr.app/img?${params.toString()}`;
}

function verifyWebhook(rawBody, headers = {}) {
    const secret = config().webhookSecret;
    if (isMockPayments() && !secret) return true;
    if (!secret) return false;
    const signature = headers['x-sepay-signature'] || headers['X-SePay-Signature'] || '';
    const timestamp = Number(headers['x-sepay-timestamp'] || headers['X-SePay-Timestamp'] || 0);
    if (!signature || !timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function matchesConfiguredAccount(payload = {}) {
    const expected = String(config().account || '');
    if (!expected) return true;
    // In SePay Test Mode, a QR paid to a virtual account is represented by the
    // parent account in `accountNumber` and the actual configured VA in
    // `subAccount`. Live non-VA transfers normally match `accountNumber`.
    return [payload.accountNumber, payload.subAccount]
        .filter(value => value !== undefined && value !== null)
        .some(value => String(value) === expected);
}

function extractPaymentCode(payload = {}) {
    const candidates = [payload.code, payload.content, payload.description].filter(Boolean);
    for (const candidate of candidates) {
        const match = String(candidate).toUpperCase().match(/(?:^|[^A-Z0-9])(FVN[A-Z0-9]{12})(?=$|[^A-Z0-9])/);
        if (match) return match[1];
    }
    return null;
}

module.exports = { config, isConfigured, createPaymentCode, qrUrl, verifyWebhook, extractPaymentCode, matchesConfiguredAccount };
