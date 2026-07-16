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
const {
    approvedWithLoginEmail,
    reminderEmail,
    expiredEmail,
    paymentConfirmedEmail
} = require('../netlify/functions/lib/emailer');
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

test('24-hour and 6-hour payment reminders fire once each', () => {
    const created = new Date('2026-07-14T00:00:00Z');
    const expires = new Date(created.getTime() + 48 * 3600000);
    const order = { status: 'pending', created_at: created, expires_at: expires, reminder_sent_at: null, final_reminder_sent_at: null };
    assert.strictEqual(decide(order, new Date(created.getTime() + 23 * 3600000)).action, 'none');
    assert.strictEqual(decide(order, new Date(created.getTime() + 24 * 3600000)).action, 'remind_initial');
    assert.strictEqual(decide({ ...order, reminder_sent_at: new Date() }, new Date(created.getTime() + 25 * 3600000)).action, 'none');
    const finalDecision = decide({ ...order, reminder_sent_at: new Date() }, new Date(expires.getTime() - 6 * 3600000));
    assert.strictEqual(finalDecision.action, 'remind_final');
    assert.strictEqual(finalDecision.hoursLeft, 6);
    assert.strictEqual(decide({ ...order, reminder_sent_at: new Date(), final_reminder_sent_at: new Date() }, new Date(expires.getTime() - 5 * 3600000)).action, 'none');
});

test('reservation expires at exactly 48 hours', () => {
    const created = new Date('2026-07-14T00:00:00Z');
    const order = { status: 'pending', created_at: created, expires_at: new Date(created.getTime() + 48 * 3600000), reminder_sent_at: new Date(), final_reminder_sent_at: new Date() };
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
    assert.match(email.subject, /Your FoundersVN seat is reserved, Jane/);
    assert.match(email.subject, /Bạn đã đặt chỗ thành công tại FoundersVN, Jane/);
    assert.ok(email.html.includes('(Tiếng Việt bên dưới)'));
    assert.ok(email.html.includes('We have reserved a seat for you for the next 48 hours.'));
    assert.ok(email.html.includes('FoundersVN đã giữ riêng một chỗ cho bạn trong 48 giờ.'));
    assert.ok(email.html.includes('Bạn đã đặt chỗ thành công tại FoundersVN'));
    assert.ok(email.html.includes('Lô 1C - 01 Võ Nguyên Giáp'));
    assert.ok(email.html.includes('Temporary password'));
    assert.ok(email.html.includes('next=%2Fpayment%3Forder%3Dorder-1'));
    assert.ok(email.html.includes('You can pay by international card through Airwallex with a 5% card fee'));
    assert.ok(email.html.includes('Bạn có thể thanh toán bằng thẻ quốc tế qua Airwallex với 5% phí thẻ'));
    assert.ok(email.html.includes('src="cid:foundersvn-logo"'));
    assert.ok(email.html.includes('src="cid:foundersvn-facebook"'));
    assert.ok(email.html.includes('src="cid:foundersvn-instagram"'));
    assert.ok(email.html.includes('src="cid:foundersvn-whatsapp"'));
    assert.equal((email.html.match(/Sign in and finish payment to confirm your seat/g) || []).length, 2);
    assert.ok(email.html.includes('@media only screen and (max-width:620px)'));
    assert.ok(email.html.includes('class="email-card"'));
    assert.ok(email.html.includes('class="email-button"'));
    assert.ok(email.html.includes('width:100%!important'));
    assert.ok(email.html.includes('aria-label="Join the FoundersVN WhatsApp community"'));
    assert.ok(email.html.includes('href="https://foundersvn.com"'));
    assert.ok(email.html.includes('href="mailto:support@foundersvn.com"'));
    assert.ok(!email.html.includes('Join the FoundersVN WhatsApp community</a>'));
    assert.ok(!email.html.includes('text-decoration:underline'));
    assert.ok(!email.html.includes('Transfer content'));
    assert.ok(!email.html.includes('Bank:'));
});

test('expired seat email is bilingual', () => {
    const email = expiredEmail({
        firstName: 'Jane',
        existingAccount: false,
        event: {
            date: 'Friday, July 31, 2026',
            location: 'Da Nang'
        }
    });
    assert.match(email.subject, /Your FoundersVN seat has been released/);
    assert.match(email.subject, /Chỗ của bạn tại FoundersVN đã được nhường cho khách khác/);
    assert.ok(email.html.includes('(Tiếng Việt bên dưới)'));
    assert.ok(email.html.includes('Chỗ của bạn tại FoundersVN đã được nhường cho khách khác'));
    assert.ok(email.html.includes('FoundersVN chưa nhận được thanh toán trong thời hạn 48 giờ'));
    assert.ok(email.html.includes('Re-apply for a seat / Đăng ký lại'));
});

test('24-hour reminder email is bilingual', () => {
    const email = reminderEmail({
        firstName: 'Jane',
        paymentUrl: 'https://foundersvn.com/payment?order=order-1',
        hoursLeft: 24,
        event: {
            date: 'Friday, July 31, 2026',
            time: '18:00',
            location: 'Da Nang',
            price: '$150.00 USD for 1 ticket'
        }
    });
    assert.match(email.subject, /One day left to complete your FoundersVN reservation/);
    assert.match(email.subject, /Chỉ còn 1 ngày để hoàn tất việc đặt chỗ tại FoundersVN/);
    assert.ok(email.html.includes('(Tiếng Việt bên dưới)'));
    assert.ok(email.html.includes('One day left to complete your FoundersVN reservation, Jane'));
    assert.ok(email.html.includes('Chỉ còn 1 ngày để hoàn tất việc đặt chỗ, Jane'));
    assert.ok(email.html.includes('hold your FoundersVN seat for one more day'));
    assert.ok(email.html.includes('giữ chỗ cho bạn thêm 1 ngày'));
    assert.ok(email.html.includes('THÔNG TIN BUỔI GẶP MẶT FOUNDERSVN'));
    assert.equal((email.html.match(/Sign in and finish payment to confirm your seat/g) || []).length, 2);
    assert.ok(email.html.includes('next=%2Fpayment%3Forder%3Dorder-1'));
    assert.ok(!email.html.includes('Payment page:'));
});

test('6-hour final reminder email uses dynamic placeholders', () => {
    const email = reminderEmail({
        firstName: 'Jane',
        paymentUrl: 'https://foundersvn.com/payment?order=order-1',
        hoursLeft: 6,
        reminderKind: 'final',
        event: {
            date: 'Friday, July 31, 2026',
            time: '18:00',
            location: 'Da Nang',
            price: '$150.00 USD for 1 ticket'
        }
    });
    assert.match(email.subject, /6 hours left to complete your FoundersVN reservation/);
    assert.match(email.subject, /Chỉ còn 6 giờ/);
    assert.ok(email.html.includes('6 hours left to complete your FoundersVN reservation, Jane'));
    assert.ok(email.html.includes('Chỉ còn 6 giờ để hoàn tất việc đặt chỗ, Jane'));
    assert.ok(email.html.includes('expires in about 6 hours'));
    assert.ok(email.html.includes('khoảng 6 giờ nữa'));
    assert.ok(email.html.includes('next=%2Fpayment%3Forder%3Dorder-1'));
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
    assert.ok(email.html.includes('THÔNG TIN BUỔI GẶP MẶT FOUNDERSVN'));
    assert.ok(email.html.includes('Lô 1C - 01 Võ Nguyên Giáp'));
    assert.ok(email.html.includes('https://foundersvn.com/meal'));
    assert.ok(email.html.includes('Choose meal options'));
    assert.ok(email.html.includes('1. Set up your profile in the app'));
    assert.ok(email.html.includes('1. Thiết lập hồ sơ trên app'));
    assert.ok(!email.html.includes('Join the FoundersVN WhatsApp community</a>'));
    assert.ok(!email.html.includes('Tham gia cộng đồng WhatsApp FoundersVN'));
    assert.ok(!email.html.includes('text-decoration:underline'));
    assert.ok(!email.html.includes('Meal selection:'));
    assert.ok(!email.html.includes('Link chọn món:'));
    assert.ok(!email.html.includes('Log in here:'));
    assert.ok(!email.html.includes('Profile link:'));
});

console.log(`\nAll ${passed} payment-flow tests passed.`);
