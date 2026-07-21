const path = require('path');
const assert = require('assert');

const fnDir = path.resolve(__dirname, '../netlify/functions');
const actionPath = path.join(fnDir, 'admin-application-action.js');
const neonPath = path.join(fnDir, 'lib', 'neon.js');
const authPath = path.join(fnDir, 'lib', 'auth.js');
const emailerPath = path.join(fnDir, 'lib', 'emailer.js');
const sepayPath = path.join(fnDir, 'lib', 'sepay.js');
const revenueModel = require('../lib/application-revenue.cjs');
const trackingModel = require('../lib/application-tracking.cjs');
const resendWebhook = require('../netlify/functions/resend-webhook');
const { normalizeResendStatus, resendFailureReason, reconcileWebhookStatuses, syncResendStatuses } = require('../netlify/functions/lib/resend-status');
const { expireOverdueReservations } = require('../netlify/functions/lib/expire-reservations');

let sqlCalls = [];
let emailCalls = [];
let templateCalls = [];
const application = {
    id: 'app1', first_name: 'Jane', email: 'jane@example.com', status: 'approved', event_id: 'evt1',
    event_name: 'FoundersVN Da Nang', event_date: '2026-07-31', event_time: '18:00', dinner_price: 150,
    member_id: 'member1', account_status: 'payment_pending', login_count: 0, payment_order_id: 'order1',
    order_status: 'pending', ticket_count: 1, base_amount_usd: 150, sepay_amount_vnd: 3900000,
    sepay_code: 'FVN-ORDER1', payment_link: 'https://foundersvn.com/payment?order=order1',
    expires_at: new Date(Date.now() + 24 * 3600000).toISOString()
};

function fakeSql(strings, ...values) {
    const text = Array.from(strings).join(' ');
    sqlCalls.push({ text, values });
    if (/FROM applications a/i.test(text)) return Promise.resolve([application]);
    return Promise.resolve([]);
}

function inject(modulePath, exports) {
    require.cache[modulePath] = { id: modulePath, filename: modulePath, loaded: true, exports };
}

function loadAction() {
    [actionPath, neonPath, authPath, emailerPath, sepayPath].forEach(modulePath => delete require.cache[modulePath]);
    inject(neonPath, { sql: fakeSql, isConfigured: () => true });
    inject(authPath, {
        isAdminRequest: event => event.headers?.authorization === 'Bearer admin',
        generateTempPassword: () => 'Temporary-Password-123',
        hashPassword: async value => `hashed:${value}`
    });
    inject(sepayPath, { config: () => ({ bank:'Bank', account:'123', accountName:'FoundersVN' }), isConfigured: () => true });
    inject(emailerPath, {
        sendEmail: async payload => { emailCalls.push(payload); return { success:true }; },
        approvedWithLoginEmail: payload => { templateCalls.push({ type:'approval', payload }); return { subject:'Approved', html:'approval' }; },
        reminderEmail: payload => { templateCalls.push({ type:'reminder', payload }); return { subject:'Reminder', html:'reminder' }; }
    });
    return require(actionPath);
}

let passed = 0;
async function test(name, fn) {
    sqlCalls = []; emailCalls = []; templateCalls = [];
    await fn(); passed += 1; console.log('  ok -', name);
}

(async () => {
    await test('tracking labels distinguish evidence from unavailable historical telemetry', async () => {
        assert.strictEqual(trackingModel.loginActivity({ order_status:'paid' }).state, 'confirmed');
        assert.match(trackingModel.loginActivity({ order_status:'paid' }).label, /confirmed by payment/i);
        assert.strictEqual(trackingModel.emailClickActivity({ order_status:'paid' }).state, 'not-relevant');
        assert.strictEqual(trackingModel.emailClickActivity({ email_tracking_available:false }).state, 'unavailable');
        assert.strictEqual(trackingModel.emailClickActivity({ email_tracking_available:true }).state, 'not-recorded');
        assert.strictEqual(trackingModel.emailClickActivity({ email_clicked:true }).state, 'tracked');
        assert.strictEqual(trackingModel.loginActivity({ login_tracking_started_at:'2026-07-21T00:00:00Z' }).state, 'not-recorded');
    });

    await test('under-$100,000 revenue follows the entrance-fee answer', async () => {
        assert.strictEqual(revenueModel.revenueDecision('under-100k', 'no'), 'declined');
        assert.strictEqual(revenueModel.revenueDecision('under-100k', 'yes'), 'pending');
        assert.strictEqual(revenueModel.revenueDecision('under-100k'), null);
        for (const option of revenueModel.REVENUE_OPTIONS.slice(1)) {
            assert.strictEqual(revenueModel.revenueDecision(option.value), 'approved');
        }
    });

    await test('Resend delivery outcomes include suppressed and canceled email', async () => {
        assert.strictEqual(resendWebhook._statusFor('email.delivered'), 'delivered');
        assert.strictEqual(resendWebhook._statusFor('email.suppressed'), 'suppressed');
        assert.strictEqual(resendWebhook._statusFor('email.canceled'), 'canceled');
        assert.strictEqual(normalizeResendStatus('delivery_delayed'), 'delayed');
    });

    await test('queued email status refreshes from the Resend record', async () => {
        const rows = [{ latest_email_provider_id:'email-1', latest_email_status:'queued', latest_email_error:null }];
        const updates = [];
        const statusSql = (strings, ...values) => { updates.push({ text:Array.from(strings).join(' '), values }); return Promise.resolve([]); };
        await syncResendStatuses(rows, {
            sql:statusSql,
            apiKey:'test-key',
            fetchImpl:async () => ({ ok:true, json:async () => ({ last_event:'delivered' }) })
        });
        assert.strictEqual(rows[0].latest_email_status, 'delivered');
        assert.ok(updates.some(update => update.values.includes('delivered')));
    });

    await test('bounced Resend record stores the provider error and SMTP diagnostic', async () => {
        const rows = [{ latest_email_provider_id:'email-bounced', latest_email_status:'bounced', latest_email_error:null }];
        const updates = [];
        await syncResendStatuses(rows, {
            sql:(strings, ...values) => { updates.push({ text:Array.from(strings).join(' '), values }); return Promise.resolve([]); },
            apiKey:'test-key',
            fetchImpl:async () => ({ ok:true, json:async () => ({
                last_event:'bounced',
                bounce:{ message:'Recipient rejected the email.', diagnosticCode:['smtp; 550 User not found'] }
            }) })
        });
        assert.strictEqual(rows[0].latest_email_status, 'bounced');
        assert.match(rows[0].latest_email_error, /Recipient rejected/);
        assert.match(rows[0].latest_email_error, /550 User not found/);
        assert.ok(updates.some(update => update.values.some(value => typeof value === 'string' && value.includes('550 User not found'))));
        assert.ok(updates.some(update => /::text/i.test(update.text)), 'nullable Resend error parameters must be typed for PostgreSQL');
        assert.match(resendFailureReason({ failed:{ reason:'Domain is not verified' } }, 'failed'), /Domain is not verified/);
    });

    await test('stored webhook events repair an email left queued by a send race', async () => {
        const rows = [{ latest_email_provider_id:'email-race', latest_email_status:'queued' }];
        const reconcileSql = strings => Promise.resolve(/strongest_event/i.test(Array.from(strings).join(' '))
            ? [{ provider_email_id:'email-race', status:'bounced', event_at:'2026-07-21T00:00:00Z', error:'Mailbox unavailable' }]
            : []);
        await reconcileWebhookStatuses(rows, reconcileSql);
        assert.strictEqual(rows[0].latest_email_status, 'bounced');
        assert.strictEqual(rows[0].latest_email_error, 'Mailbox unavailable');
    });

    await test('sending-only Resend key reports why status cannot refresh', async () => {
        const rows = [{ latest_email_provider_id:'email-2', latest_email_status:'queued' }];
        await syncResendStatuses(rows, {
            sql:() => Promise.resolve([]),
            apiKey:'sending-only-key',
            fetchImpl:async () => ({ ok:false, status:403, json:async () => ({ message:'Restricted API key' }) })
        });
        assert.match(rows[0].latest_email_sync_error, /Full access/i);
        assert.match(rows[0].latest_email_sync_error, /RESEND_API_KEY/i);
    });

    await test('webhook signing secret used as read key reports the configuration error', async () => {
        const rows = [{ latest_email_provider_id:'email-3', latest_email_status:'queued' }];
        await syncResendStatuses(rows, {
            sql:() => Promise.resolve([]),
            apiKey:'whsec_not_an_api_key',
            fetchImpl:async () => ({ ok:false, status:400, json:async () => ({ message:'API key is invalid' }) })
        });
        assert.match(rows[0].latest_email_sync_error, /RESEND_API_KEY/i);
        assert.match(rows[0].latest_email_sync_error, /beginning with re_/i);
        assert.match(rows[0].latest_email_sync_error, /whsec_/i);
    });

    await test('an unreachable Resend API keeps the provider result separate from refresh health', async () => {
        const rows = [{ latest_email_provider_id:'email-4', latest_email_status:'bounced', latest_email_error:null }];
        await syncResendStatuses(rows, {
            sql:() => Promise.resolve([]),
            apiKey:'full-access-key',
            fetchImpl:async () => { throw new Error('network unavailable'); }
        });
        assert.strictEqual(rows[0].latest_email_status, 'bounced');
        assert.match(rows[0].latest_email_sync_error, /reach Resend/i);
        assert.strictEqual(rows[0].latest_email_error, null);
    });

    await test('expired reservations release seats and keep the member account usable', async () => {
        const cleanupCalls = [];
        const cleanupSql = (strings, ...values) => { cleanupCalls.push({ text:Array.from(strings).join(' '), values }); return Promise.resolve([{ id:'order-1' }]); };
        await expireOverdueReservations(cleanupSql, 'member-1');
        assert.match(cleanupCalls[0].text, /SET status = 'expired'/i);
        assert.match(cleanupCalls[0].text, /payment_status = 'expired'/i);
        assert.match(cleanupCalls[0].text, /account_status = 'active'/i);
        assert.ok(cleanupCalls[0].values.includes('member-1'));
    });

    await test('admin follow-up rejects unauthenticated requests', async () => {
        const action = loadAction();
        const response = await action.handler({ httpMethod:'POST', headers:{}, body:JSON.stringify({ id:'app1', action:'send_reminder' }) });
        assert.strictEqual(response.statusCode, 401);
        assert.strictEqual(emailCalls.length, 0);
    });

    await test('admin can send a tracked manual payment reminder', async () => {
        const action = loadAction();
        const response = await action.handler({ httpMethod:'POST', headers:{ authorization:'Bearer admin' }, body:JSON.stringify({ id:'app1', action:'send_reminder' }) });
        assert.strictEqual(response.statusCode, 200, response.body);
        assert.strictEqual(templateCalls[0].type, 'reminder');
        assert.strictEqual(emailCalls[0].tracking.type, 'manual_payment_reminder');
    });

    await test('email preview does not send or rotate credentials', async () => {
        const action = loadAction();
        const response = await action.handler({ httpMethod:'POST', headers:{ authorization:'Bearer admin' }, body:JSON.stringify({ id:'app1', action:'resend_approval', preview:true }) });
        const body = JSON.parse(response.body);
        assert.strictEqual(response.statusCode, 200, response.body);
        assert.strictEqual(body.preview, true);
        assert.strictEqual(body.email, application.email);
        assert.strictEqual(body.subject, 'Approved');
        assert.strictEqual(emailCalls.length, 0);
        assert.ok(!sqlCalls.some(call => /UPDATE members SET password_hash/i.test(call.text)));
    });

    await test('approval resend safely rotates an unused payment-pending password', async () => {
        const action = loadAction();
        const response = await action.handler({ httpMethod:'POST', headers:{ authorization:'Bearer admin' }, body:JSON.stringify({ id:'app1', action:'resend_approval' }) });
        assert.strictEqual(response.statusCode, 200, response.body);
        assert.ok(sqlCalls.some(call => /UPDATE members SET password_hash/i.test(call.text)));
        assert.strictEqual(templateCalls[0].payload.existingAccount, false);
        assert.strictEqual(templateCalls[0].payload.tempPassword, 'Temporary-Password-123');
        assert.strictEqual(emailCalls[0].tracking.type, 'approval_resend');
    });

    console.log(`\nAll ${passed} application funnel tests passed.`);
})().catch(error => {
    console.error('\nTEST FAILED:', error.message); console.error(error.stack); process.exit(1);
});
