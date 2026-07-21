// Unit tests for netlify/functions/db-api.js — no live database required.
//
// We inject a FAKE lib/neon module into require.cache BEFORE loading db-api, so
// the consolidated data API runs against a spy `sql` tagged-template that records
// every (strings, values) call. This lets us assert:
//   1. the action router dispatches to the right SQL,
//   2. user input is passed as BOUND PARAMETERS (never string-interpolated into
//      the SQL text) — i.e. SQL injection is prevented,
//   3. admin-gated actions require the x-admin-token header,
//   4. graceful behavior for unknown actions / missing DATABASE_URL.

const path = require('path');
const assert = require('assert');

const neonPath = path.resolve(__dirname, '../netlify/functions/lib/neon.js');
const dbApiPath = path.resolve(__dirname, '../netlify/functions/db-api.js');
const authPath = path.resolve(__dirname, '../netlify/functions/lib/auth.js');

let calls = [];
let nextRows = [];

// Spy tagged-template. Signature matches @neondatabase/serverless: sql`... ${v} ...`.
function fakeSql(strings, ...values) {
    calls.push({ strings: Array.from(strings), values });
    return Promise.resolve(nextRows);
}

function loadDbApi({ configured = true } = {}) {
    // Fresh module state each load.
    delete require.cache[neonPath];
    delete require.cache[dbApiPath];
    require.cache[neonPath] = {
        id: neonPath,
        filename: neonPath,
        loaded: true,
        exports: {
            sql: fakeSql,
            query: async () => nextRows,
            getSql: () => fakeSql,
            isConfigured: () => configured,
            DATABASE_URL: configured ? 'postgres://fake' : ''
        }
    };
    return require(dbApiPath);
}

function reset() { calls = []; nextRows = []; }

function invoke(api, { action, payload, headers = {}, method = 'POST' }) {
    return api.handler({
        httpMethod: method,
        headers,
        body: JSON.stringify({ action, payload })
    });
}

let passed = 0;
async function test(name, fn) {
    reset();
    await fn();
    passed++;
    console.log('  ok -', name);
}

(async () => {
    process.env.ADMIN_TOKEN = 'secret-token';
    process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough';
    const { signToken } = require(authPath);
    const memberToken = signToken({ sub: 'm-current', email: 'me@x.co', is_admin: false });
    const memberHeaders = { authorization: `Bearer ${memberToken}` };

    // ---- routing + parameter binding ------------------------------------
    let api = loadDbApi();

    await test('members.get binds id as a parameter, not interpolated', async () => {
        nextRows = [{ id: 'm1', email: 'a@b.co' }];
        const res = await invoke(api, { action: 'members.get', payload: { id: "x'; DROP TABLE members; --" }, headers: memberHeaders });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(calls.length, 1);
        // The malicious string must appear ONLY in values, never in the SQL text.
        const sqlText = calls[0].strings.join('?');
        assert.ok(!sqlText.includes('DROP TABLE'), 'injection leaked into SQL text');
        assert.ok(calls[0].values.includes("x'; DROP TABLE members; --"));
        assert.deepStrictEqual(JSON.parse(res.body).data, { id: 'm1', email: 'a@b.co' });
    });

    await test('members.list returns array under data', async () => {
        nextRows = [{ id: 1 }, { id: 2 }];
        const res = await invoke(api, { action: 'members.list', payload: {}, headers: memberHeaders });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(JSON.parse(res.body).data.length, 2);
        assert.ok(calls[0].strings.join(' ').includes('JOIN members'));
    });

    await test('member directory is unavailable without a valid session', async () => {
        const res = await invoke(api, { action: 'members.list', payload: {} });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(calls.length, 0);
    });

    await test('members.update can clear profile photo and websites intentionally', async () => {
        nextRows = [{ id: 'm-current', profile_photo: null, websites: [] }];
        const res = await invoke(api, {
            action: 'members.update',
            payload: { profile: { websites: [], profilePhoto: null } },
            headers: memberHeaders
        });
        assert.strictEqual(res.statusCode, 200);
        const sqlText = calls[0].strings.join('?');
        assert.ok(sqlText.includes('CASE WHEN'), 'intentional clear should be guarded by CASE WHEN');
        assert.ok(calls[0].values.includes('[]'), 'empty website array must be bound for sync');
        assert.ok(calls[0].values.includes(true), 'profilePhoto presence flag must be bound');
        assert.ok(calls[0].values.includes('m-current'), 'member update must target the JWT subject');
    });

    await test('attendance.register is member-gated and derives member from JWT', async () => {
        let res = await invoke(api, {
            action: 'attendance.register',
            payload: { memberId: 'spoofed-member', eventId: 'event-1', ticketType: 'dinner', paymentStatus: 'paid' }
        });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(calls.length, 0);

        nextRows = [{ id: 'attendance-1', member_id: 'm-current' }];
        res = await invoke(api, {
            action: 'attendance.register',
            payload: { memberId: 'spoofed-member', eventId: 'event-1', ticketType: 'dinner', paymentStatus: 'paid' },
            headers: memberHeaders
        });
        assert.strictEqual(res.statusCode, 200);
        assert.ok(calls[0].values.includes('m-current'), 'attendance must use JWT member id');
        assert.ok(!calls[0].values.includes('spoofed-member'), 'client-supplied member id must be ignored');
    });

    await test('bookings.create stores booking under the JWT member', async () => {
        nextRows = [{ id: 'bkg-1', user_id: 'm-current' }];
        const res = await invoke(api, {
            action: 'bookings.create',
            payload: { id: 'bkg-1', user_id: 'spoofed-member', user_email: 'spoof@example.com', event_id: 'event-1', ticket_type: 'dinner' },
            headers: memberHeaders
        });
        assert.strictEqual(res.statusCode, 200);
        assert.ok(calls[0].values.includes('m-current'), 'booking must use JWT member id');
        assert.ok(calls[0].values.includes('me@x.co'), 'booking must use JWT email');
        assert.ok(!calls[0].values.includes('spoofed-member'), 'client-supplied user_id must be ignored');
    });

    await test('applications.create binds every field as a parameter', async () => {
        nextRows = [{ id: 'app1' }];
        const payload = { firstName: 'Ann', lastName: "O'Brien", email: 'ANN@X.CO', company: 'Acme' };
        const res = await invoke(api, { action: 'applications.create', payload });
        assert.strictEqual(res.statusCode, 200);
        // email lowercased, apostrophe passed safely as a bound value
        assert.ok(calls[0].values.includes('ann@x.co'));
        assert.ok(calls[0].values.includes("O'Brien"));
        const sqlText = calls[0].strings.join('?');
        assert.ok(!sqlText.includes("O'Brien"), 'value leaked into SQL text');
    });

    await test('events.list with status filters via parameter', async () => {
        nextRows = [];
        await invoke(api, { action: 'events.list', payload: { status: 'open' } });
        assert.deepStrictEqual(calls[0].values, ['open']);
    });

    await test('bookings.stats aggregates ticket types in JS', async () => {
        nextRows = [{ ticket_type: 'dinner' }, { ticket_type: 'full' }, { ticket_type: 'dinner' }];
        const res = await invoke(api, { action: 'bookings.stats', payload: { eventId: 'e1' }, headers: { 'x-admin-token': 'secret-token' } });
        assert.deepStrictEqual(JSON.parse(res.body).data, { dinner: 2, cruise: 1, total: 3 });
    });

    await test('payments.list returns every payment order for the logged-in member', async () => {
        nextRows = [
            { id:'paid-order', member_id:'m-current', status:'paid', ticket_count:1, event_name:'Paid event', meal_order:{ items:[{ itemId:'starter', name:'Starter', quantity:1, lineTotalVnd:185000 }], totalVnd:212750, amountDueVnd:0 }, meal_total_vnd:212750, meal_submitted_at:'2026-07-19T00:00:00Z' },
            { id:'pending-order', member_id:'m-current', status:'pending', ticket_count:1, event_name:'Pending event' }
        ];
        const res = await invoke(api, { action:'payments.list', payload:{}, headers:memberHeaders });
        assert.strictEqual(res.statusCode, 200);
        const data = JSON.parse(res.body).data;
        assert.strictEqual(data.length, 2);
        assert.deepStrictEqual(data.map(row=>row.status), ['paid', 'pending']);
        assert.strictEqual(data[0].meal.items[0].name, 'Starter');
        assert.strictEqual(data[0].meal.totalVnd, 212750);
        assert.strictEqual(data[1].meal, null);
        const listCall = calls.find(call => call.strings.join(' ').includes('LEFT JOIN event_attendance'));
        assert.ok(listCall, 'ticket list should include the saved meal for each registration');
        assert.ok(listCall.values.includes('m-current'));
    });

    await test('payments.current treats the order URL as a locator, not authorization', async () => {
        nextRows = [{ id:'order-from-url', member_id:'m-current', status:'pending', ticket_count:1 }];
        const res = await invoke(api, {
            action:'payments.current', payload:{ orderId:'order-from-url' }, headers:memberHeaders
        });
        assert.strictEqual(res.statusCode, 200);
        const orderCall = calls.find(call => call.strings.join(' ').includes('po.id ='));
        const sqlText = orderCall.strings.join(' ');
        assert.ok(sqlText.includes('po.id ='));
        assert.ok(sqlText.includes('po.member_id ='), 'order lookup must also match the authenticated member');
        assert.ok(orderCall.values.includes('order-from-url'));
        assert.ok(orderCall.values.includes('m-current'));
    });

    await test('payment page views are recorded separately from login and scoped to the member', async () => {
        nextRows = [{ id:'order-1', payment_page_view_count:1 }];
        const res = await invoke(api, {
            action:'payments.markPageViewed', payload:{ orderId:'order-1' }, headers:memberHeaders
        });
        assert.strictEqual(res.statusCode, 200, res.body);
        const sqlText = calls[0].strings.join(' ');
        assert.match(sqlText, /payment_page_first_viewed_at/i);
        assert.match(sqlText, /payment_page_view_count/i);
        assert.ok(calls[0].values.includes('order-1'));
        assert.ok(calls[0].values.includes('m-current'));
    });

    await test('meals.get scopes the menu to the selected paid ticket and member', async () => {
        nextRows = [{
            attendance_id:'attendance-1', payment_order_id:'order-1', event_id:'event-1',
            event_name:'Selected event', meal_order:null
        }];
        const res = await invoke(api, {
            action:'meals.get', payload:{ orderId:'order-1' }, headers:memberHeaders
        });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(JSON.parse(res.body).data.payment_order_id, 'order-1');
        const sqlText = calls[0].strings.join(' ');
        assert.ok(sqlText.includes("po.status = 'paid'"));
        assert.ok(sqlText.includes("ea.payment_status = 'paid'"));
        assert.ok(calls[0].values.includes('order-1'));
        assert.ok(calls[0].values.includes('m-current'));
    });

    await test('transactions.all clamps limit and binds it', async () => {
        nextRows = [];
        await invoke(api, { action: 'transactions.all', payload: { limit: 999999 }, headers: { 'x-admin-token': 'secret-token' } });
        assert.deepStrictEqual(calls[0].values, [1000]); // clamped to max 1000
    });

    // ---- admin gating ----------------------------------------------------
    await test('applications.list without admin token -> 401', async () => {
        const res = await invoke(api, { action: 'applications.list', payload: {} });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(calls.length, 0, 'must not run SQL when unauthorized');
    });

    await test('applications.list WITH correct admin token -> 200', async () => {
        nextRows = [{ id: 'app1' }];
        const res = await invoke(api, {
            action: 'applications.list', payload: {},
            headers: { 'x-admin-token': 'secret-token' }
        });
        assert.strictEqual(res.statusCode, 200);
        assert.ok(calls.some(call => call.strings.join(' ').includes('provider_email_id')), 'application tracking includes the Resend record id');
        assert.ok(calls.some(call => call.strings.join(' ').includes('engagement_tracking_enabled')), 'application tracking exposes whether click measurement was enabled');
        assert.ok(calls.some(call => call.strings.join(' ').includes('email_webhook_events')), 'application click history uses immutable webhook events');
        assert.ok(calls.some(call => call.strings.join(' ').includes('po.member_id')), 'payment order member id is the authoritative account link');
        assert.strictEqual(JSON.parse(res.body).data.length, 1);
    });

    await test('applications.delete is admin-only and removes application-owned records without deleting the member', async () => {
        assert.ok(api._ADMIN_ACTIONS.has('applications.delete'));
        let res = await invoke(api, { action:'applications.delete', payload:{ id:'app-1' } });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(calls.length, 0);

        nextRows = [{ id:'app-1', email:'test@example.com', payment_orders_removed:1, attendance_removed:1, emails_removed:2 }];
        res = await invoke(api, { action:'applications.delete', payload:{ id:'app-1' }, headers:{ 'x-admin-token':'secret-token' } });
        assert.strictEqual(res.statusCode, 200, res.body);
        const sqlText = calls[0].strings.join(' ');
        assert.match(sqlText, /DELETE FROM applications/i);
        assert.match(sqlText, /DELETE FROM payment_events/i);
        assert.match(sqlText, /DELETE FROM event_attendance/i);
        assert.match(sqlText, /DELETE FROM email_deliveries/i);
        assert.match(sqlText, /DELETE FROM email_webhook_events/i);
        assert.ok(!/DELETE FROM members/i.test(sqlText));
        assert.strictEqual(JSON.parse(res.body).data.member_account_preserved, true);
    });

    await test('attendance.adminCheckinList is admin-only and returns paid event tickets', async () => {
        let res = await invoke(api, { action: 'attendance.adminCheckinList', payload: { eventId: 'event-1' } });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(calls.length, 0);

        nextRows = [{ attendance_id: 'a1', seat_count: 2, meal_option: 'steak', guest_meal_option: 'vegan' }];
        res = await invoke(api, {
            action: 'attendance.adminCheckinList', payload: { eventId: 'event-1' },
            headers: { 'x-admin-token': 'secret-token' }
        });
        assert.strictEqual(res.statusCode, 200);
        assert.ok(calls[0].values.includes('event-1'));
        const sqlText = calls[0].strings.join('?');
        assert.ok(sqlText.includes("ea.payment_status = 'paid'"));
        assert.ok(sqlText.includes('m.profile_photo'), 'complete guest export should include the member profile image');
        assert.ok(sqlText.includes('po.airwallex_total_usd'), 'complete guest export should include payment totals');
        assert.ok(sqlText.includes('a.status AS application_status'), 'complete guest export should include application lifecycle');
        assert.strictEqual(JSON.parse(res.body).data[0].seat_count, 2);
    });

    await test('attendance.checkIn resolves an event ticket reference and is admin-only', async () => {
        assert.ok(api._ADMIN_ACTIONS.has('attendance.checkIn'));
        let res = await invoke(api, { action: 'attendance.checkIn', payload: { eventId: 'e1', reference: 'FVN:order-1' } });
        assert.strictEqual(res.statusCode, 401);
        nextRows = [{ attendance_id: 'a1', checked_in: true, booking_reference: 'order-1' }];
        res = await invoke(api, { action: 'attendance.checkIn', payload: { eventId: 'e1', reference: 'FVN:order-1' }, headers: { 'x-admin-token': 'secret-token' } });
        assert.strictEqual(res.statusCode, 200);
        assert.ok(calls.at(-1).values.includes('order-1'));
        assert.ok(calls.at(-1).strings.join('?').includes("ea.payment_status = 'paid'"));
    });

    await test('events.create with wrong token -> 401', async () => {
        const res = await invoke(api, {
            action: 'events.create', payload: { slug: 's', name: 'n', date: '2026-01-01' },
            headers: { 'x-admin-token': 'nope' }
        });
        assert.strictEqual(res.statusCode, 401);
    });

    await test('events CRUD mutations are admin-gated and bind event values', async () => {
        assert.ok(api._ADMIN_ACTIONS.has('events.create'));
        assert.ok(api._ADMIN_ACTIONS.has('events.update'));
        assert.ok(api._ADMIN_ACTIONS.has('events.delete'));
        const adminHeaders = { 'x-admin-token': 'secret-token' };

        nextRows = [{ id: 'event-1', slug: 'new-event' }];
        let res = await invoke(api, { action: 'events.create', headers: adminHeaders, payload: {
            slug: 'new-event', name: 'New Event', date: '2026-09-01', capacity: 25, price: 150,
            location: 'Da Nang', venueName: 'Editable Venue', venueAddress: '123 Admin Street'
        }});
        assert.strictEqual(res.statusCode, 200, res.body);
        assert.ok(calls[0].values.includes('new-event'));
        assert.ok(calls[0].values.includes('Editable Venue'));
        assert.ok(calls[0].values.includes('123 Admin Street'));

        reset(); nextRows = [{ id: 'event-1', slug: 'updated-event' }];
        res = await invoke(api, { action: 'events.update', headers: adminHeaders, payload: {
            id: 'event-1', slug: 'updated-event', name: 'Updated Event', date: '2026-09-02', capacity: 30, price: 160,
            location: 'Ho Chi Minh City', venueName: 'Updated Venue', venueAddress: '456 Admin Avenue'
        }});
        assert.strictEqual(res.statusCode, 200, res.body);
        assert.ok(calls[0].values.includes('event-1'));
        assert.ok(calls[0].values.includes('updated-event'));
        assert.ok(calls[0].values.includes('Updated Venue'));
        assert.ok(calls[0].values.includes('456 Admin Avenue'));

        reset(); nextRows = [{ applications: 0, attendance: 0, id: 'event-1' }];
        res = await invoke(api, { action: 'events.delete', headers: adminHeaders, payload: { id: 'event-1' } });
        assert.strictEqual(res.statusCode, 200, res.body);
        assert.strictEqual(calls.length, 2);
    });

    await test('event_photos.add is admin-gated', async () => {
        assert.ok(api._ADMIN_ACTIONS.has('event_photos.add'));
        const res = await invoke(api, { action: 'event_photos.add', payload: { eventId: 'e', photoUrl: 'u' } });
        assert.strictEqual(res.statusCode, 401);
    });

    // ---- error handling --------------------------------------------------
    await test('unknown action -> 400', async () => {
        const res = await invoke(api, { action: 'nope.nope', payload: {} });
        assert.strictEqual(res.statusCode, 400);
    });

    await test('OPTIONS preflight -> 200 with CORS', async () => {
        const res = await api.handler({ httpMethod: 'OPTIONS', headers: {}, body: '' });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.headers['Access-Control-Allow-Origin'], '*');
    });

    await test('GET method -> 405', async () => {
        const res = await invoke(api, { action: 'members.list', payload: {}, method: 'GET' });
        assert.strictEqual(res.statusCode, 405);
    });

    // ---- not configured (no DATABASE_URL) --------------------------------
    const apiUnconfigured = loadDbApi({ configured: false });
    await test('no DATABASE_URL -> 503 notConfigured (browser falls back to localStorage)', async () => {
        const res = await invoke(apiUnconfigured, { action: 'members.list', payload: {} });
        assert.strictEqual(res.statusCode, 503);
        assert.strictEqual(JSON.parse(res.body).notConfigured, true);
    });

    console.log(`\nAll ${passed} db-api tests passed.`);
})().catch(e => {
    console.error('\nTEST FAILED:', e.message);
    console.error(e.stack);
    process.exit(1);
});
