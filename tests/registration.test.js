// ============================================================
// Unit tests for the membership REGISTRATION flow — no live DB / network.
//
// We inject a FAKE lib/neon (spy `sql` tagged-template) and a FAKE lib/airwallex
// into require.cache before loading the functions. lib/auth (real bcrypt) and
// lib/emailer (real templates; sendEmail no-ops to a "mock" when RESEND_API_KEY
// is unset) are loaded for real, so we exercise the ACTUAL password hashing.
//
// Asserts the desired flow:
//   * submit-application  → inserts an event-scoped application, but does not
//                           create an account before admin approval.
//   * accept-application  → flips the member to is_approved = true, stores a
//                           bcrypt password_hash, and returns a temp password.
//   * db-api members.create → hashes a PLAINTEXT password (stored value is a
//                           bcrypt $2 hash), honors is_admin, and IGNORES any
//                           spoofed pre-hashed `password_hash` from the browser.
// ============================================================

const path = require('path');
const assert = require('assert');
process.env.PAYMENTS_ENV = 'mock';
process.env.PAYMENT_PROVIDERS = 'airwallex,sepay';

const fnDir = path.resolve(__dirname, '../netlify/functions');
const neonPath = path.join(fnDir, 'lib', 'neon.js');
const airwallexPath = path.join(fnDir, 'lib', 'airwallex.js');
const emailerPath = path.join(fnDir, 'lib', 'emailer.js');
const authPath = path.join(fnDir, 'lib', 'auth.js');
const submitPath = path.join(fnDir, 'submit-application.js');
const acceptPath = path.join(fnDir, 'accept-application.js');
const dbApiPath = path.join(fnDir, 'db-api.js');

// ---- shared spy state ------------------------------------------------------
let calls = [];
let appRow = null;
const memberRow = { id: 'm1', email: 'jane@x.co', first_name: 'Jane', last_name: 'Doe', is_approved: true };

function fakeSql(strings, ...values) {
    const text = Array.from(strings).join(' ');
    calls.push({ text, strings: Array.from(strings), values });
    if (/FROM events/i.test(text) && /WHERE slug/i.test(text)) {
        return Promise.resolve([{ id: 'evt1', slug: 'danang-jul-2026', name: 'FoundersVN Da Nang', dinner_price: 150 }]);
    }
    if (/FROM applications a/i.test(text)) return Promise.resolve(appRow ? [appRow] : []);
    if (/INSERT INTO members/i.test(text)) return Promise.resolve([memberRow]);
    if (/INSERT INTO applications/i.test(text)) return Promise.resolve([appRow || { id: 'app1' }]);
    return Promise.resolve([]);
}

function fakeNeon() {
    return {
        sql: fakeSql,
        query: async () => [],
        getSql: () => fakeSql,
        isConfigured: () => true,
        DATABASE_URL: 'postgres://fake'
    };
}

function inject(p, exports) {
    require.cache[p] = { id: p, filename: p, loaded: true, exports };
}
function fresh(paths) { paths.forEach(p => delete require.cache[p]); }

function loadSubmit() {
    fresh([neonPath, emailerPath, submitPath]);
    inject(neonPath, fakeNeon());
    return require(submitPath);
}
function loadAccept(createPaymentLink = async () => ({ url: 'https://pay.mock/x', mock: true })) {
    fresh([neonPath, airwallexPath, emailerPath, authPath, acceptPath]);
    inject(neonPath, fakeNeon());
    inject(airwallexPath, { createPaymentLink });
    return require(acceptPath);
}
function loadDbApi() {
    fresh([neonPath, authPath, dbApiPath]);
    inject(neonPath, fakeNeon());
    return require(dbApiPath);
}

function reset() { calls = []; appRow = null; }
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$.{53}$/;
function findHash(values) {
    return values.find(v => typeof v === 'string' && BCRYPT_RE.test(v));
}

let passed = 0;
async function test(name, fn) {
    reset();
    await fn();
    passed++;
    console.log('  ok -', name);
}

(async () => {
    delete process.env.RESEND_API_KEY;         // emailer -> mock send, no network
    process.env.ADMIN_TOKEN = 'secret-token';  // admin gate

    const auth = require(authPath);            // real bcrypt for round-trip checks

    // -----------------------------------------------------------------
    // submit-application: event-scoped application only
    // -----------------------------------------------------------------
    const submit = loadSubmit();
    const completeApplicationPayload = {
        name: 'Jane Doe',
        email: 'JANE@X.CO',
        company: 'Acme',
        role: 'CEO',
        event_slug: 'danang-jul-2026',
        company_link: 'https://acme.test',
        industry: 'Tech / SaaS',
        looking_for: 'Customers / Clients',
        can_offer: 'Expertise / Advice',
        what_you_do: 'Building founder workflow software',
        links: '+84 901 234 567',
        language: 'en'
    };

    await test('submit-application inserts an event-scoped application without creating an account', async () => {
        const res = await submit.handler({
            httpMethod: 'POST',
            headers: {},
            body: JSON.stringify(completeApplicationPayload)
        });
        assert.strictEqual(res.statusCode, 200, 'expected 200');

        const appInsert = calls.find(c => /INSERT INTO applications/i.test(c.text));
        const memInsert = calls.find(c => /INSERT INTO members/i.test(c.text));
        assert.ok(appInsert, 'must insert an application');
        assert.ok(!memInsert, 'account must not exist before approval');
        assert.ok(appInsert.values.includes('evt1'), 'application is bound to the selected event id');
        assert.ok(appInsert.values.includes('jane@x.co'), 'email is normalized and bound');
    });

    await test('submit-application rejects incomplete landing application data', async () => {
        const res = await submit.handler({
            httpMethod: 'POST',
            headers: {},
            body: JSON.stringify({ ...completeApplicationPayload, looking_for: '' })
        });
        assert.strictEqual(res.statusCode, 400);
        assert.match(JSON.parse(res.body).error, /looking_for/i);
        assert.strictEqual(calls.length, 0, 'no SQL for incomplete application');
    });

    await test('submit-application upserts only within the same event', async () => {
        await submit.handler({
            httpMethod: 'POST', headers: {},
            body: JSON.stringify({ ...completeApplicationPayload, email: 'jane@x.co' })
        });
        const appInsert = calls.find(c => /INSERT INTO applications/i.test(c.text));
        assert.ok(/ON CONFLICT \(event_id, LOWER\(email\)\)/i.test(appInsert.text));
    });

    // -----------------------------------------------------------------
    // accept-application: approve + bcrypt login + temp password
    // -----------------------------------------------------------------
    const accept = loadAccept();

    await test('accept-application without admin token -> 401', async () => {
        const res = await accept.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ id: 'app1' }) });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(calls.length, 0, 'no SQL when unauthorized');
    });

    await test('accept-application approves member + sets bcrypt hash + returns temp password', async () => {
        appRow = {
            id: 'app1', email: 'jane@x.co', first_name: 'Jane', last_name: 'Doe',
            company: 'Acme', role: 'CEO', industry: 'saas', status: 'pending',
            event_id: 'evt1', event_slug: 'danang-jul-2026', event_name: 'FoundersVN Da Nang',
            event_date: '2026-07-31', dinner_price: 150
        };
        const res = await accept.handler({
            httpMethod: 'POST',
            headers: { 'x-admin-token': 'secret-token' },
            body: JSON.stringify({ id: 'app1' })
        });
        assert.strictEqual(res.statusCode, 200, res.body);
        const out = JSON.parse(res.body);

        // Temp password is returned to the (admin-gated) caller as a fallback.
        assert.ok(typeof out.tempPassword === 'string' && out.tempPassword.length >= 10, 'temp password returned');
        assert.ok(out.loginUrl && /login/i.test(out.loginUrl), 'login URL returned');

        const memInsert = calls.find(c => /INSERT INTO members/i.test(c.text));
        assert.ok(memInsert, 'must upsert the member');

        // is_approved = true (literal) and must_reset_password = true.
        assert.ok(/is_approved/i.test(memInsert.text) && /must_reset_password/i.test(memInsert.text));
        assert.ok(/=\s*true/i.test(memInsert.text) || memInsert.values.includes(true), 'approved on accept');

        // A real bcrypt hash was stored — and it verifies against the temp password.
        const hash = findHash(memInsert.values);
        assert.ok(hash, 'a bcrypt password_hash must be stored');
        assert.ok(hash.startsWith('$2'), 'stored value must be a bcrypt hash');
        assert.strictEqual(await auth.checkPassword(out.tempPassword, hash), true, 'temp password round-trips');
        assert.notStrictEqual(hash, out.tempPassword, 'must never store plaintext');
    });

    await test('accept-application in SePay-only mode never calls Airwallex', async () => {
        process.env.PAYMENT_PROVIDERS = 'sepay';
        let airwallexCalls = 0;
        const sepayOnlyAccept = loadAccept(async () => {
            airwallexCalls += 1;
            throw new Error('Airwallex must not be called');
        });
        appRow = {
            id: 'app1', email: 'jane@x.co', first_name: 'Jane', last_name: 'Doe',
            company: 'Acme', role: 'CEO', industry: 'saas', status: 'pending',
            event_id: 'evt1', event_slug: 'danang-jul-2026', event_name: 'FoundersVN Da Nang',
            event_date: '2026-07-31', dinner_price: 150
        };
        const res = await sepayOnlyAccept.handler({
            httpMethod: 'POST',
            headers: { 'x-admin-token': 'secret-token' },
            body: JSON.stringify({ id: 'app1' })
        });
        process.env.PAYMENT_PROVIDERS = 'airwallex,sepay';
        assert.strictEqual(res.statusCode, 200, res.body);
        assert.strictEqual(airwallexCalls, 0);
        const out = JSON.parse(res.body);
        assert.strictEqual(out.airwallexAvailable, false);
    });

    // -----------------------------------------------------------------
    // db-api members.create: hash plaintext, honor is_admin, reject spoof
    // -----------------------------------------------------------------
    const api = loadDbApi();
    const adminHdr = { 'x-admin-token': 'secret-token' };
    const invoke = (payload) => api.handler({
        httpMethod: 'POST', headers: adminHdr,
        body: JSON.stringify({ action: 'members.create', payload })
    });

    await test('members.create is admin-gated', async () => {
        assert.ok(api._ADMIN_ACTIONS.has('members.create'));
        const res = await api.handler({
            httpMethod: 'POST', headers: {},
            body: JSON.stringify({ action: 'members.create', payload: { email: 'x@y.co', password: 'p' } })
        });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(calls.length, 0, 'no SQL when unauthorized');
    });

    await test('members.create hashes a plaintext password and honors is_admin', async () => {
        const res = await invoke({ email: 'admin@x.co', first_name: 'Ad', password: 'PlainText123', is_admin: true });
        assert.strictEqual(res.statusCode, 200, res.body);
        const call = calls[0];
        const hash = findHash(call.values);
        assert.ok(hash, 'a bcrypt hash must be among the bound values');
        assert.ok(hash.startsWith('$2'), 'stored value starts with $2');
        assert.ok(!call.values.includes('PlainText123'), 'plaintext must never be bound/stored');
        assert.strictEqual(await auth.checkPassword('PlainText123', hash), true, 'hash verifies');
        assert.ok(call.values.includes(true), 'is_admin true must be bound');
    });

    await test('members.create IGNORES a spoofed pre-hashed password_hash from the browser', async () => {
        const spoof = '$2a$10$SPOOFEDaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaBB';
        const res = await invoke({ email: 'spoof@x.co', password_hash: spoof, password: 'realpw' });
        assert.strictEqual(res.statusCode, 200, res.body);
        const call = calls[0];
        assert.ok(!call.values.includes(spoof), 'the spoofed hash must never be trusted/bound');
        const hash = findHash(call.values);
        assert.ok(hash && hash !== spoof, 'must hash the real plaintext instead');
        assert.strictEqual(await auth.checkPassword('realpw', hash), true, 'stored hash is of the real password');
    });

    await test('members.create with ONLY a spoofed hash (no password) stores NULL, not the spoof', async () => {
        const spoof = '$2a$10$SPOOFEDaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaBB';
        const res = await invoke({ email: 'nopw@x.co', password_hash: spoof });
        assert.strictEqual(res.statusCode, 200, res.body);
        const call = calls[0];
        assert.ok(!call.values.includes(spoof), 'spoofed hash never bound');
        assert.ok(!findHash(call.values), 'no password hash when no plaintext supplied');
        assert.ok(call.values.includes(null), 'password_hash bound as NULL');
    });

    console.log(`\nAll ${passed} registration tests passed.`);
})().catch(e => {
    console.error('\nTEST FAILED:', e.message);
    console.error(e.stack);
    process.exit(1);
});
