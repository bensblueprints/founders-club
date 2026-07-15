const assert = require('assert');
const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.PAYMENTS_ENV = 'mock';
process.env.DATA_ENCRYPTION_KEY = 'test-payment-field-encryption-key';
process.env.SEPAY_WEBHOOK_SECRET = 'test-sepay-secret';
process.env.AIRWALLEX_WEBHOOK_SECRET = 'test-airwallex-secret';

const { encrypt, decrypt } = require('../netlify/functions/lib/field-crypto');
const { verifyWebhook, extractPaymentCode, matchesConfiguredAccount } = require('../netlify/functions/lib/sepay');
const { _verifySignature: verifyAirwallexWebhook } = require('../netlify/functions/airwallex-webhook');
const { config: airwallexConfig } = require('../netlify/functions/lib/airwallex');
const { approvedWithLoginEmail, paymentConfirmedEmail } = require('../netlify/functions/lib/emailer');
const fs = require('fs');
const { decide } = require('../netlify/functions/lib/reminders');

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log('  ok -', name);
}

test('payment URLs are AES-GCM encrypted and decrypt correctly', () => {
    const url = 'https://payments.example/secret-link';
    const encrypted = encrypt(url);
    assert.notStrictEqual(encrypted, url);
    assert.ok(encrypted.startsWith('v1:'));
    assert.strictEqual(decrypt(encrypted), url);
});

test('24-hour reminder fires once', () => {
    const created = new Date('2026-07-14T00:00:00Z');
    const order = { status: 'pending', created_at: created, expires_at: new Date(created.getTime() + 48 * 3600000), reminder_sent_at: null };
    assert.strictEqual(decide(order, new Date(created.getTime() + 23 * 3600000)).action, 'none');
    assert.strictEqual(decide(order, new Date(created.getTime() + 24 * 3600000)).action, 'remind');
    assert.strictEqual(decide({ ...order, reminder_sent_at: new Date() }, new Date(created.getTime() + 25 * 3600000)).action, 'none');
});

test('reservation expires at exactly 48 hours', () => {
    const created = new Date('2026-07-14T00:00:00Z');
    const order = { status: 'pending', created_at: created, expires_at: new Date(created.getTime() + 48 * 3600000), reminder_sent_at: new Date() };
    assert.strictEqual(decide(order, new Date(created.getTime() + 47 * 3600000 + 59000)).action, 'none');
    assert.strictEqual(decide(order, new Date(created.getTime() + 48 * 3600000)).action, 'expire');
});

test('SePay verifies timestamped HMAC and rejects tampering', () => {
    const body = JSON.stringify({ id: 1, code: 'FVN123', transferAmount: 3900000 });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = 'sha256=' + crypto.createHmac('sha256', process.env.SEPAY_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex');
    const headers = { 'x-sepay-timestamp': String(timestamp), 'x-sepay-signature': signature };
    assert.strictEqual(verifyWebhook(body, headers), true);
    assert.strictEqual(verifyWebhook(body + ' ', headers), false);
});

test('SePay extracts an exact payment code from webhook content', () => {
    const code = 'FVN123456789ABC';
    assert.strictEqual(extractPaymentCode({ code: null, content: `${code} thanh toan` }), code);
    assert.strictEqual(extractPaymentCode({ content: `X${code}Z` }), null);
});

test('SePay Test Mode can match the configured virtual account via subAccount', () => {
    const previous = process.env.SEPAY_ACCOUNT_NUMBER;
    process.env.SEPAY_ACCOUNT_NUMBER = 'SBSEPAYXC8VOYCKDD91';
    assert.strictEqual(matchesConfiguredAccount({ accountNumber: '0000000001', subAccount: 'SBSEPAYXC8VOYCKDD91' }), true);
    assert.strictEqual(matchesConfiguredAccount({ accountNumber: '0000000001', subAccount: 'OTHER' }), false);
    process.env.SEPAY_ACCOUNT_NUMBER = previous;
});

test('Airwallex verifies timestamp plus raw body and rejects tampering', () => {
    const body = JSON.stringify({ id: 'evt_1', name: 'payment_intent.succeeded' });
    const timestamp = String(Date.now());
    const signature = crypto.createHmac('sha256', process.env.AIRWALLEX_WEBHOOK_SECRET)
        .update(`${timestamp}${body}`).digest('hex');
    const headers = { 'x-timestamp': timestamp, 'x-signature': signature };
    assert.strictEqual(verifyAirwallexWebhook(body, headers), true);
    assert.strictEqual(verifyAirwallexWebhook(body + ' ', headers), false);
});

test('PAYMENTS_ENV switches Airwallex between sandbox and production hosts', () => {
    process.env.PAYMENTS_ENV = 'production';
    assert.strictEqual(airwallexConfig().baseUrl, 'https://api.airwallex.com');
    assert.strictEqual(airwallexConfig().webhookSecret, process.env.AIRWALLEX_WEBHOOK_SECRET);
    process.env.PAYMENTS_ENV = 'sandbox';
    assert.strictEqual(airwallexConfig().baseUrl, 'https://api-demo.airwallex.com');
    process.env.PAYMENTS_ENV = 'mock';
});

test('Airwallex accepts legacy AIRWALLEX_ENV value as API key', () => {
    const previousApiKey = process.env.AIRWALLEX_API_KEY;
    const previousLegacy = process.env.AIRWALLEX_ENV;
    process.env.AIRWALLEX_API_KEY = '';
    process.env.AIRWALLEX_ENV = 'prod-live-api-key-from-netlify';
    assert.strictEqual(airwallexConfig().apiKey, 'prod-live-api-key-from-netlify');
    process.env.AIRWALLEX_ENV = 'production';
    assert.strictEqual(airwallexConfig().apiKey, '');
    process.env.AIRWALLEX_API_KEY = previousApiKey;
    process.env.AIRWALLEX_ENV = previousLegacy;
});

test('Airwallex capability check does not reject Vietnamese accounts locally', () => {
    const source = fs.readFileSync(require.resolve('../netlify/functions/lib/airwallex'), 'utf8');
    assert.ok(!source.includes("country === 'VN'"));
    assert.ok(source.includes('/api/v1/pa/payment_intents/create'));
    assert.ok(source.includes('/api/v1/pa/payment_links?page_num=0&page_size=1'));
});

test('approval email uses the V1 bilingual seat-held template', () => {
    const email = approvedWithLoginEmail({
        firstName: 'Jane',
        email: 'jane@example.com',
        tempPassword: 'Temp123456!',
        loginUrl: 'https://foundersvn.com/login',
        paymentUrl: 'https://foundersvn.com/payment?order=order-1',
        expiresAt: '2026-07-17T11:00:00Z',
        ticketCount: 1,
        event: {
            name: 'FoundersVN Da Nang',
            date: 'Friday, July 31, 2026',
            time: '18:00',
            location: 'Da Nang',
            price: '$150.00 USD for 1 ticket'
        }
    });
    assert.match(email.subject, /You have a seat at FoundersVN, Jane/);
    assert.match(email.subject, /Bạn đã có một chỗ tại FoundersVN, Jane/);
    assert.ok(email.html.includes('(Tiếng Việt bên dưới)'));
    assert.ok(email.html.includes('We have reserved a seat for you for the next 48 hours.'));
    assert.ok(email.html.includes('FoundersVN đã giữ riêng một chỗ cho bạn trong 48 giờ.'));
    assert.ok(email.html.includes('Temporary password'));
    assert.ok(email.html.includes('https://foundersvn.com/payment?order=order-1'));
});

test('payment confirmation email links to meal selection', () => {
    const email = paymentConfirmedEmail({
        firstName: 'Jane',
        email: 'jane@example.com',
        mealUrl: 'https://foundersvn.com/meal',
        appUrl: 'https://foundersvn.com/login',
        profileUrl: 'https://foundersvn.com/profile',
        receiptUrl: 'https://foundersvn.com/payment?order=order-1',
        paymentMethod: 'SePay / VietQR bank transfer',
        communityUrl: 'https://chat.whatsapp.com/test',
        ticketCount: 2,
        event: {
            name: 'FoundersVN Da Nang',
            date: 'Friday, July 31, 2026',
            time: '18:00',
            location: 'Da Nang'
        }
    });
    assert.match(email.subject, /You are confirmed, Jane/);
    assert.match(email.subject, /Đã xác nhận, Jane/);
    assert.ok(email.html.includes('(Tiếng Việt bên dưới)'));
    assert.ok(email.html.includes('Your payment has been received and your seat is confirmed.'));
    assert.ok(email.html.includes('FoundersVN đã nhận được thanh toán'));
    assert.ok(email.html.includes('https://foundersvn.com/meal'));
    assert.ok(email.html.includes('Choose meal options'));
});

console.log(`\nAll ${passed} payment-flow tests passed.`);
