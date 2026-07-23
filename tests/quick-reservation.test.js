const assert = require('assert');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.PAYMENTS_ENV = 'mock';

const quick = require('../netlify/functions/quick-reservation');
const { paymentConfirmedEmail } = require('../netlify/functions/lib/emailer');

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

    const standardEmail = paymentConfirmedEmail(common);
    assert.ok(!standardEmail.html.includes('Temporary password'));
    assert.ok(!standardEmail.html.includes('Mật khẩu tạm thời'));
});

test('quick checkout migration stores no plaintext access token or password', () => {
    const migration = fs.readFileSync(path.resolve(__dirname, '../migrations/2026-07-23-quick-reservation-checkout.sql'), 'utf8');
    assert.ok(migration.includes('quick_access_token_hash'));
    assert.ok(migration.includes('quick_temp_password_encrypted'));
    assert.ok(!migration.includes('quick_access_token TEXT'));
    assert.ok(!migration.includes('quick_temp_password TEXT'));
});

console.log(`\nAll ${passed} quick-reservation tests passed.`);
