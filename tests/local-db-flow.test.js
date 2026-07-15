// Run with a disposable local Postgres database:
// DATABASE_URL=postgresql://founders:founders@localhost:5432/founders_club \
// DB_DRIVER=pg SESSION_SECRET=local-test-secret ADMIN_TOKEN=local-admin npm run test:integration

const assert = require('assert');
const crypto = require('crypto');
const { Pool } = require('pg');

const submit = require('../netlify/functions/submit-application');
const accept = require('../netlify/functions/accept-application');
const webhook = require('../netlify/functions/airwallex-webhook');
const sepayWebhook = require('../netlify/functions/sepay-webhook');
const login = require('../netlify/functions/auth-login');
const changePassword = require('../netlify/functions/auth-change-password');
const api = require('../netlify/functions/db-api');
const reminders = require('../netlify/functions/payment-reminders');
const registerEvent = require('../netlify/functions/register-event');
const { hashPassword, signToken } = require('../netlify/functions/lib/auth');

const email = 'integration-flow@foundersvn.test';
const expiredEmail = 'integration-expiry@foundersvn.test';
const existingEmail = 'integration-existing-member@foundersvn.test';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function invoke(handler, body, headers = {}) {
    return handler({ httpMethod: 'POST', headers, body: JSON.stringify(body) });
}

function applicationPayload(overrides = {}) {
    return {
        name: 'Integration Founder',
        email,
        company: 'Local Co',
        role: 'Founder',
        event_slug: 'danang-jul-2026',
        company_link: 'https://local.example',
        industry: 'Tech / SaaS',
        looking_for: 'Customers / Clients',
        can_offer: 'Expertise / Advice',
        what_you_do: 'Building better founder operations',
        links: 'https://linkedin.com/in/integration-founder',
        language: 'en',
        ...overrides
    };
}

async function invokeAirwallex(body) {
    const rawBody = JSON.stringify(body);
    const timestamp = String(Date.now());
    const signature = crypto.createHmac('sha256', process.env.AIRWALLEX_WEBHOOK_SECRET)
        .update(`${timestamp}${rawBody}`).digest('hex');
    return webhook.handler({
        httpMethod: 'POST',
        headers: { 'x-timestamp': timestamp, 'x-signature': signature },
        body: rawBody
    });
}

async function invokeSepay(body) {
    const rawBody = JSON.stringify(body);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `sha256=${crypto.createHmac('sha256', process.env.SEPAY_WEBHOOK_SECRET)
        .update(`${timestamp}.${rawBody}`).digest('hex')}`;
    return sepayWebhook.handler({
        httpMethod: 'POST',
        headers: { 'x-sepay-timestamp': timestamp, 'x-sepay-signature': signature },
        body: rawBody
    });
}

(async () => {
  try {
    await pool.query('DELETE FROM members WHERE LOWER(email) = LOWER($1)', [email]);
    await pool.query('DELETE FROM applications WHERE LOWER(email) = LOWER($1)', [email]);

    // Existing members register from their account. Approval must reserve the
    // event but must never replace their password or issue new credentials.
    await pool.query('DELETE FROM applications WHERE LOWER(email) = LOWER($1)', [existingEmail]);
    await pool.query('DELETE FROM members WHERE LOWER(email) = LOWER($1)', [existingEmail]);
    const existingHash = await hashPassword('ExistingMember123!');
    const existingMember = (await pool.query(`
        INSERT INTO members
            (email, password_hash, first_name, last_name, company, role,
             is_approved, account_status, must_reset_password)
        VALUES ($1, $2, 'Existing', 'Member', 'Existing Co', 'Founder', true, 'active', false)
        RETURNING id`, [existingEmail, existingHash])).rows[0];
    const existingToken = signToken({ sub: existingMember.id, email: existingEmail, is_admin: false });
    const memberRegistration = await invoke(registerEvent.handler, {
        eventSlug: 'hcmc-aug-2026', ticketCount: 1
    }, { authorization: `Bearer ${existingToken}` });
    assert.strictEqual(memberRegistration.statusCode, 200, memberRegistration.body);
    const memberApplicationId = JSON.parse(memberRegistration.body).applicationId;
    const existingApprovalResponse = await invoke(accept.handler, { id: memberApplicationId }, { 'x-admin-token': process.env.ADMIN_TOKEN });
    assert.strictEqual(existingApprovalResponse.statusCode, 200, existingApprovalResponse.body);
    const existingApproval = JSON.parse(existingApprovalResponse.body);
    assert.strictEqual(existingApproval.accountReused, true);
    assert.strictEqual(existingApproval.tempPassword, null);
    const existingAfterApproval = (await pool.query(
        'SELECT password_hash, account_status, must_reset_password FROM members WHERE id = $1',
        [existingMember.id]
    )).rows[0];
    assert.strictEqual(existingAfterApproval.password_hash, existingHash);
    assert.strictEqual(existingAfterApproval.account_status, 'active');
    assert.strictEqual(existingAfterApproval.must_reset_password, false);
    const existingOrder = (await pool.query(
        'SELECT * FROM payment_orders WHERE application_id = $1',
        [memberApplicationId]
    )).rows[0];
    assert.strictEqual(existingOrder.account_was_existing, true);
    const sepayPaid = await invokeSepay({
        id: 900001,
        gateway: process.env.SEPAY_BANK,
        transactionDate: '2026-07-14 12:00:00',
        accountNumber: process.env.SEPAY_ACCOUNT_NUMBER,
        code: null,
        content: `${existingOrder.sepay_code} thanh toan ve`,
        transferType: 'in',
        description: 'Sandbox transfer',
        transferAmount: Number(existingOrder.sepay_amount_vnd),
        referenceCode: 'SEPAY-INTEGRATION-900001'
    });
    assert.strictEqual(sepayPaid.statusCode, 200, sepayPaid.body);
    const sepayOrderState = (await pool.query('SELECT status, paid_provider FROM payment_orders WHERE id = $1', [existingOrder.id])).rows[0];
    assert.strictEqual(sepayOrderState.status, 'paid');
    assert.strictEqual(sepayOrderState.paid_provider, 'sepay');

    const submitted = await invoke(submit.handler, applicationPayload({
        ticket_count: 2,
        guest_name: 'Integration Partner'
    }));
    assert.strictEqual(submitted.statusCode, 200, submitted.body);
    const applicationId = JSON.parse(submitted.body).id;

    let rows = (await pool.query('SELECT * FROM applications WHERE id = $1', [applicationId])).rows;
    assert.strictEqual(rows[0].status, 'pending');
    assert.ok(rows[0].event_id);

    const accepted = await invoke(accept.handler, { id: applicationId }, { 'x-admin-token': process.env.ADMIN_TOKEN });
    assert.strictEqual(accepted.statusCode, 200, accepted.body);
    const approval = JSON.parse(accepted.body);
    assert.ok(approval.tempPassword);

    rows = (await pool.query('SELECT * FROM event_attendance WHERE application_id = $1', [applicationId])).rows;
    assert.strictEqual(rows[0].payment_status, 'awaiting');
    assert.strictEqual(rows[0].seat_count, 2);

    const order = (await pool.query('SELECT * FROM payment_orders WHERE application_id = $1', [applicationId])).rows[0];
    assert.strictEqual(order.status, 'pending');
    assert.strictEqual(Number(order.airwallex_total_usd), 315);
    assert.strictEqual(Number(order.airwallex_fee_usd), 15);
    assert.strictEqual(Number(order.sepay_amount_vnd), 7800000);
    assert.ok(new Date(order.expires_at).getTime() - new Date(order.created_at).getTime() <= 48 * 60 * 60 * 1000 + 5000);

    const signedIn = await invoke(login.handler, { email, password: approval.tempPassword });
    assert.strictEqual(signedIn.statusCode, 200, signedIn.body);
    let token = JSON.parse(signedIn.body).token;

    const changed = await invoke(changePassword.handler, { password: 'IntegrationSecure123!' }, { authorization: `Bearer ${token}` });
    assert.strictEqual(changed.statusCode, 200, changed.body);
    token = JSON.parse(changed.body).token;

    const beforePayment = await invoke(api.handler, { action: 'members.list', payload: {} }, { authorization: `Bearer ${token}` });
    assert.strictEqual(beforePayment.statusCode, 403);
    assert.strictEqual(JSON.parse(beforePayment.body).paymentRequired, true);

    const paid = await invokeAirwallex({
        name: 'payment_intent.succeeded',
        id: 'evt-integration-paid',
        data: { object: { id: 'pi-integration', amount: 315, currency: 'USD', metadata: { payment_order_id: order.id, application_id: applicationId, email } } }
    });
    assert.strictEqual(paid.statusCode, 200, paid.body);

    rows = (await pool.query('SELECT payment_status, paid_at FROM event_attendance WHERE application_id = $1', [applicationId])).rows;
    assert.strictEqual(rows[0].payment_status, 'paid');
    assert.ok(rows[0].paid_at);

    const afterPayment = await invoke(api.handler, { action: 'members.list', payload: {} }, { authorization: `Bearer ${token}` });
    assert.ok(JSON.parse(afterPayment.body).data.some(member => member.email === email));

    const mealSaved = await invoke(api.handler, { action: 'meals.update', payload: { mealOption: 'steak', guestMealOption: 'vegan' } }, { authorization: `Bearer ${token}` });
    assert.strictEqual(mealSaved.statusCode, 200, mealSaved.body);
    assert.strictEqual(JSON.parse(mealSaved.body).data.meal_option, 'steak');
    assert.strictEqual(JSON.parse(mealSaved.body).data.guest_meal_option, 'vegan');

    // A second reservation verifies the 48-hour release and account lock path.
    const submittedExpiry = await invoke(submit.handler, applicationPayload({
        name: 'Expiry Founder', email: expiredEmail, company: 'Expiry Co', role: 'Founder',
        event_slug: 'hcmc-aug-2026', ticket_count: 1,
        company_link: 'https://expiry.example',
        links: 'https://linkedin.com/in/expiry-founder'
    }));
    assert.strictEqual(submittedExpiry.statusCode, 200, submittedExpiry.body);
    const expiryApplicationId = JSON.parse(submittedExpiry.body).id;
    const acceptedExpiry = await invoke(accept.handler, { id: expiryApplicationId }, { 'x-admin-token': process.env.ADMIN_TOKEN });
    assert.strictEqual(acceptedExpiry.statusCode, 200, acceptedExpiry.body);
    await pool.query("UPDATE payment_orders SET expires_at = NOW() - INTERVAL '1 minute', created_at = NOW() - INTERVAL '49 hours' WHERE application_id = $1", [expiryApplicationId]);
    const expiredRun = await reminders.handler();
    assert.strictEqual(expiredRun.statusCode, 200, expiredRun.body);
    const expiredState = (await pool.query(`
        SELECT po.status AS order_status, a.payment_status, ea.payment_status AS attendance_status, m.account_status
        FROM payment_orders po
        JOIN applications a ON a.id = po.application_id
        JOIN event_attendance ea ON ea.application_id = a.id
        JOIN members m ON m.id = po.member_id
        WHERE a.id = $1`, [expiryApplicationId])).rows[0];
    assert.strictEqual(expiredState.order_status, 'expired');
    assert.strictEqual(expiredState.payment_status, 'expired');
    assert.strictEqual(expiredState.attendance_status, 'expired');
    assert.strictEqual(expiredState.account_status, 'locked');

    console.log('Local DB application → approval → payment → directory flow passed.');
  } finally {
    await pool.query('DELETE FROM members WHERE LOWER(email) = LOWER($1)', [email]);
    await pool.query('DELETE FROM applications WHERE LOWER(email) = LOWER($1)', [email]);
    await pool.query('DELETE FROM members WHERE LOWER(email) = LOWER($1)', [expiredEmail]);
    await pool.query('DELETE FROM applications WHERE LOWER(email) = LOWER($1)', [expiredEmail]);
    await pool.query('DELETE FROM applications WHERE LOWER(email) = LOWER($1)', [existingEmail]);
    await pool.query('DELETE FROM members WHERE LOWER(email) = LOWER($1)', [existingEmail]);
    await pool.end();
  }
})().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
