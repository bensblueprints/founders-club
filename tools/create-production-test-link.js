const { createTestToken } = require('../netlify/functions/lib/production-test-checkout');

const baseUrl = String(process.env.PRODUCTION_TEST_BASE_URL || 'https://foundersvn.com').replace(/\/$/, '');
const requestedMinutes = Number(process.argv[2] || 30);
const lifetimeSeconds = Math.min(Math.max(requestedMinutes, 1), 60) * 60;

try {
    const token = createTestToken({ lifetimeSeconds });
    console.log(`${baseUrl}/reservation?test=${encodeURIComponent(token)}`);
    console.log(`\nThis test link expires in ${Math.round(lifetimeSeconds / 60)} minutes and creates one 5,000 VND SePay order for the private test event.`);
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
