// Disposable Postgres integration test for the public quick checkout.

const assert = require('assert');
const { Pool } = require('pg');

const quickReservation = require('../netlify/functions/quick-reservation');

const email = 'quick-checkout-integration@foundersvn.test';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function invoke(body) {
    return quickReservation.handler({
        httpMethod: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
    });
}

(async () => {
    try {
        await pool.query('DELETE FROM members WHERE LOWER(email) = LOWER($1)', [email]);

        const createdResponse = await invoke({
            action: 'create',
            eventSlug: 'danang-jul-2026',
            fullName: 'Quick Integration Founder',
            phone: '+84 901 234 567',
            email,
            ticketCount: 1
        });
        assert.strictEqual(createdResponse.statusCode, 200, createdResponse.body);
        const created = JSON.parse(createdResponse.body).order;
        assert.strictEqual(created.status, 'pending');
        assert.ok(created.accessToken);
        assert.ok(created.sepayCode);

        const staged = (await pool.query(`
            SELECT m.password_hash, m.account_status, po.quick_access_token_hash,
                   po.quick_new_member, ea.id AS attendance_id
            FROM payment_orders po
            JOIN members m ON m.id = po.member_id
            LEFT JOIN event_attendance ea ON ea.application_id = po.application_id
            WHERE po.id = $1`, [created.id])).rows[0];
        assert.strictEqual(staged.password_hash, null);
        assert.strictEqual(staged.account_status, 'payment_pending');
        assert.strictEqual(staged.quick_new_member, true);
        assert.ok(staged.quick_access_token_hash);
        assert.strictEqual(staged.attendance_id, null);

        const paidResponse = await invoke({
            action: 'mockPay',
            orderId: created.id,
            accessToken: created.accessToken,
            provider: 'sepay'
        });
        assert.strictEqual(paidResponse.statusCode, 200, paidResponse.body);

        const statusResponse = await invoke({
            action: 'status',
            orderId: created.id,
            accessToken: created.accessToken
        });
        assert.strictEqual(statusResponse.statusCode, 200, statusResponse.body);
        const paid = JSON.parse(statusResponse.body).order;
        assert.strictEqual(paid.status, 'paid');
        assert.strictEqual(paid.credentials.email, email);
        assert.ok(paid.credentials.temporaryPassword);
        assert.strictEqual(paid.credentials.existingAccount, false);

        const finalized = (await pool.query(`
            SELECT m.password_hash, m.account_status, m.must_reset_password,
                   ea.payment_status, ea.seat_count, po.quick_temp_password_encrypted
            FROM payment_orders po
            JOIN members m ON m.id = po.member_id
            JOIN event_attendance ea ON ea.application_id = po.application_id
            WHERE po.id = $1`, [created.id])).rows[0];
        assert.ok(finalized.password_hash);
        assert.strictEqual(finalized.account_status, 'active');
        assert.strictEqual(finalized.must_reset_password, true);
        assert.strictEqual(finalized.payment_status, 'paid');
        assert.strictEqual(finalized.seat_count, 1);
        assert.ok(finalized.quick_temp_password_encrypted);

        console.log('Quick reservation -> verified payment -> account + ticket flow passed.');
    } finally {
        await pool.query('DELETE FROM members WHERE LOWER(email) = LOWER($1)', [email]);
        await pool.end();
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
