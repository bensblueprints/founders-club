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

    // ---- routing + parameter binding ------------------------------------
    let api = loadDbApi();

    await test('members.get binds id as a parameter, not interpolated', async () => {
        nextRows = [{ id: 'm1', email: 'a@b.co' }];
        const res = await invoke(api, { action: 'members.get', payload: { id: "x'; DROP TABLE members; --" } });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(calls.length, 1);
        // The malicious string must appear ONLY in values, never in the SQL text.
        const sqlText = calls[0].strings.join('?');
        assert.ok(!sqlText.includes('DROP TABLE'), 'injection leaked into SQL text');
        assert.deepStrictEqual(calls[0].values, ["x'; DROP TABLE members; --"]);
        assert.deepStrictEqual(JSON.parse(res.body).data, { id: 'm1', email: 'a@b.co' });
    });

    await test('members.list returns array under data', async () => {
        nextRows = [{ id: 1 }, { id: 2 }];
        const res = await invoke(api, { action: 'members.list', payload: {} });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(JSON.parse(res.body).data.length, 2);
        assert.ok(calls[0].strings.join(' ').includes('FROM members'));
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
        const res = await invoke(api, { action: 'bookings.stats', payload: { eventId: 'e1' } });
        assert.deepStrictEqual(JSON.parse(res.body).data, { dinner: 2, cruise: 1, total: 3 });
    });

    await test('transactions.all clamps limit and binds it', async () => {
        nextRows = [];
        await invoke(api, { action: 'transactions.all', payload: { limit: 999999 } });
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
        assert.strictEqual(JSON.parse(res.body).data.length, 1);
    });

    await test('events.create with wrong token -> 401', async () => {
        const res = await invoke(api, {
            action: 'events.create', payload: { slug: 's', name: 'n', date: '2026-01-01' },
            headers: { 'x-admin-token': 'nope' }
        });
        assert.strictEqual(res.statusCode, 401);
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
