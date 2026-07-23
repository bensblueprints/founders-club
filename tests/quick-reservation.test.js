const assert = require('assert');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.PAYMENTS_ENV = 'mock';
process.env.QUICK_RESERVATION_TEST_SECRET = 'test-secret-with-at-least-thirty-two-characters';

const quick = require('../netlify/functions/quick-reservation');
const { paymentConfirmedEmail } = require('../netlify/functions/lib/emailer');
const { createTestToken } = require('../netlify/functions/lib/production-test-checkout');

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log('  ok -', name);
}

test('quick checkout normalizes identity fields without trusting client pricing', () => {
    assert.strictEqual(quick._helpers.normalizeEmail('  JANE@Example.COM '), 'jane@example.com');
    assert.deepStrictEqual(quick._helpers.splitName('Jane Mai Doe'), {
        firstName: 'Jane',
        lastName: 'Mai Doe'
    });
    assert.strictEqual(quick._helpers.validEmail('jane@example.com'), true);
    assert.strictEqual(quick._helpers.validEmail('not-an-email'), false);

    const source = fs.readFileSync(path.resolve(__dirname, '../netlify/functions/quick-reservation.js'), 'utf8');
    assert.ok(source.includes('selectedEvent.dinner_price'));
    assert.ok(!source.includes('body.baseAmountUsd'));
    assert.ok(!source.includes('body.sepayAmountVnd'));
});

test('quick checkout hashes browser access tokens before persistence', () => {
    const hash = quick._helpers.tokenHash('secret-link-token');
    assert.strictEqual(hash.length, 64);
    assert.notStrictEqual(hash, 'secret-link-token');
    assert.strictEqual(hash, quick._helpers.tokenHash('secret-link-token'));
});

test('production test links are signed, short lived, and tamper resistant', () => {
    const now = Date.UTC(2026, 6, 23, 10, 0, 0);
    const token = createTestToken({ now, lifetimeSeconds: 1800, nonce: 'fixed-test-nonce' });
    assert.strictEqual(quick._helpers.verifyTestToken(token, { now: now + 1000 }), true);
    assert.strictEqual(quick._helpers.verifyTestToken(`${token}changed`, { now: now + 1000 }), false);
    assert.strictEqual(quick._helpers.verifyTestToken(token, { now: now + 1801 * 1000 }), false);
});

test('production test checkout forces one exact 5,000 VND SePay amount', () => {
    assert.deepStrictEqual(quick._helpers.checkoutAmounts({
        dinnerPrice: 150,
        ticketCount: 2,
        testMode: true,
        conversionRate: 26000
    }), {
        baseAmountUsd: 0.19,
        airwallexFeeUsd: 0,
        airwallexTotalUsd: 0.19,
        sepayAmountVnd: 5000
    });
});

test('paid confirmation includes temporary credentials only when supplied', () => {
    const common = {
        firstName: 'Jane',
        email: 'jane@example.com',
        mealUrl: 'https://foundersvn.com/meal?order=one',
        appUrl: 'https://foundersvn.com/login',
        event: { name: 'FoundersVN Da Nang', date: 'Friday, July 31, 2026', time: '18:00' }
    };
    const quickEmail = paymentConfirmedEmail({ ...common, temporaryPassword: 'Temp-Example-123!' });
    assert.ok(quickEmail.html.includes('Temporary password'));
    assert.ok(quickEmail.html.includes('Temp-Example-123!'));
    assert.ok(quickEmail.html.includes('Mật khẩu tạm thời'));
    assert.ok(quickEmail.html.includes('YOUR FOUNDERSVN ACCOUNT'));
    assert.ok(quickEmail.html.includes('TÀI KHOẢN FOUNDERSVN CỦA BẠN'));
    assert.ok(quickEmail.html.includes('background-color:rgba(242,201,76,0.1)'));

    const standardEmail = paymentConfirmedEmail(common);
    assert.ok(!standardEmail.html.includes('Temporary password'));
    assert.ok(!standardEmail.html.includes('Mật khẩu tạm thời'));

    const testEmail = paymentConfirmedEmail({ ...common, temporaryPassword: 'Temp-Example-123!', testMode: true });
    assert.ok(testEmail.html.includes('PRODUCTION TEST COMPLETE'));
    assert.ok(testEmail.html.includes('ĐÃ HOÀN TẤT KIỂM TRA THANH TOÁN'));
    assert.ok(!testEmail.html.includes('750,000 VND FOOD CREDIT'));
    assert.ok(!testEmail.html.includes('Choose meal option'));
});

test('quick checkout migration stores no plaintext access token or password', () => {
    const migration = fs.readFileSync(path.resolve(__dirname, '../migrations/2026-07-23-quick-reservation-checkout.sql'), 'utf8');
    const schema = fs.readFileSync(path.resolve(__dirname, '../db/neon-schema.sql'), 'utf8');
    assert.ok(migration.includes('quick_access_token_hash'));
    assert.ok(migration.includes('quick_temp_password_encrypted'));
    assert.ok(!migration.includes('quick_access_token TEXT'));
    assert.ok(!migration.includes('quick_temp_password TEXT'));
    assert.ok(schema.indexOf('ADD COLUMN IF NOT EXISTS quick_access_token_hash') < schema.indexOf('idx_payment_orders_quick_access_token'));
});

test('local database failures return a useful setup instruction', () => {
    assert.match(
        quick._helpers.requestFailure(new Error('password authentication failed for user "founders"')),
        /npm run stack:setup/i
    );
});

test('the private production test event is closed to normal registration', () => {
    const migration = fs.readFileSync(path.resolve(__dirname, '../migrations/2026-07-23-production-test-checkout.sql'), 'utf8');
    assert.ok(migration.includes("'production-payment-test'"));
    assert.ok(migration.includes("'closed'"));
    assert.ok(migration.includes('5,000 VND'));
});

console.log(`\nAll ${passed} quick-reservation tests passed.`);
