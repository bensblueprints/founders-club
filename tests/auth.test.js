// Unit tests for the server-side auth stack — no live database or network.
//
// Covers:
//   1. bcrypt hash/verify round-trip (lib/auth hashPassword/checkPassword)
//   2. JWT sign/verify + expiry + tamper + wrong-secret rejection
//   3. publicUser strips the password hash
//   4. isAdminRequest: admin JWT / member JWT / ADMIN_TOKEN header
//   5. auth-login: success returns a token + hash-free user; wrong password and
//      unknown email BOTH return a generic 401
//   6. db-api admin gating accepts an admin JWT and rejects a member JWT; member
//      actions require a member JWT and derive the sender from the token
//
// A fake lib/neon is injected into require.cache so the handlers run against a
// spy `sql` tagged-template (no real Postgres).

const path = require('path');
const assert = require('assert');

const authLibPath = path.resolve(__dirname, '../netlify/functions/lib/auth.js');
const neonPath = path.resolve(__dirname, '../netlify/functions/lib/neon.js');
const loginPath = path.resolve(__dirname, '../netlify/functions/auth-login.js');
const changePasswordPath = path.resolve(__dirname, '../netlify/functions/auth-change-password.js');
const dbApiPath = path.resolve(__dirname, '../netlify/functions/db-api.js');

process.env.SESSION_SECRET = 'test-session-secret-please-change';
process.env.ADMIN_TOKEN = 'shared-admin-secret';

const auth = require(authLibPath);

let calls = [];
let nextRows = [];
function fakeSql(strings, ...values) {
    calls.push({ strings: Array.from(strings), values });
    return Promise.resolve(nextRows);
}
function injectNeon({ configured = true } = {}) {
    require.cache[neonPath] = {
        id: neonPath, filename: neonPath, loaded: true,
        exports: {
            sql: fakeSql,
            query: async () => nextRows,
            getSql: () => fakeSql,
            isConfigured: () => configured,
            DATABASE_URL: configured ? 'postgres://fake' : ''
        }
    };
}
function loadFresh(modPath) {
    delete require.cache[modPath];
    delete require.cache[dbApiPath];
    delete require.cache[loginPath];
    delete require.cache[changePasswordPath];
    injectNeon();
    return require(modPath);
}
function reset() { calls = []; nextRows = []; }

let passed = 0;
async function test(name, fn) {
    reset();
    await fn();
    passed++;
    console.log('  ok -', name);
}

(async () => {
    // ---------------------------------------------------------------
    // 1. bcrypt round-trip
    // ---------------------------------------------------------------
    await test('hashPassword/checkPassword round-trip', async () => {
        const hash = await auth.hashPassword('S3cret!Pass');
        assert.ok(hash.startsWith('$2'), 'looks like a bcrypt hash');
        assert.notStrictEqual(hash, 'S3cret!Pass', 'hash != plaintext');
        assert.strictEqual(await auth.checkPassword('S3cret!Pass', hash), true);
        assert.strictEqual(await auth.checkPassword('wrong', hash), false);
        assert.strictEqual(await auth.checkPassword('x', ''), false);
    });

    // ---------------------------------------------------------------
    // 2. JWT sign/verify/expiry/tamper/secret
    // ---------------------------------------------------------------
    await test('signToken/verifyToken round-trip preserves claims', () => {
        const t = auth.signToken({ sub: 'm1', email: 'a@b.co', is_admin: true, role: 'Founder' });
        const p = auth.verifyToken(t);
        assert.ok(p, 'verifies');
        assert.strictEqual(p.sub, 'm1');
        assert.strictEqual(p.email, 'a@b.co');
        assert.strictEqual(p.is_admin, true);
        assert.ok(p.iat && p.exp && p.exp > p.iat, 'iat/exp set');
    });

    await test('verifyToken rejects an expired token', () => {
        const past = Math.floor(Date.now() / 1000) - 10;
        const t = auth.signToken({ sub: 'm1', exp: past });
        assert.strictEqual(auth.verifyToken(t), null);
    });

    await test('verifyToken rejects a tampered payload', () => {
        const t = auth.signToken({ sub: 'm1', is_admin: false });
        const parts = t.split('.');
        // Flip the payload to claim admin, keep the original signature.
        const forged = Buffer.from(JSON.stringify({ sub: 'm1', is_admin: true, exp: 9999999999 }))
            .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const tampered = `${parts[0]}.${forged}.${parts[2]}`;
        assert.strictEqual(auth.verifyToken(tampered), null);
    });

    await test('verifyToken rejects a token signed with a different secret', () => {
        const t = auth.signToken({ sub: 'm1' });
        const saved = process.env.SESSION_SECRET;
        process.env.SESSION_SECRET = 'a-totally-different-secret';
        const result = auth.verifyToken(t);
        process.env.SESSION_SECRET = saved;
        assert.strictEqual(result, null);
    });

    await test('verifyToken rejects garbage / non-JWT input', () => {
        assert.strictEqual(auth.verifyToken('not.a.jwt'), null);
        assert.strictEqual(auth.verifyToken(''), null);
        assert.strictEqual(auth.verifyToken(null), null);
    });

    // ---------------------------------------------------------------
    // 3. publicUser strips the hash
    // ---------------------------------------------------------------
    await test('publicUser removes password_hash and maps names', () => {
        const u = auth.publicUser({
            id: 'm1', email: 'a@b.co', password_hash: '$2b$10$xxxxx',
            first_name: 'Ann', last_name: 'Lee', is_admin: true, member_type: 'owner',
            bio: 'hi', must_reset_password: true
        });
        assert.strictEqual(u.password_hash, undefined, 'no hash leaks');
        assert.strictEqual(u.firstName, 'Ann');
        assert.strictEqual(u.lastName, 'Lee');
        assert.strictEqual(u.memberType, 'owner');
        assert.strictEqual(u.is_admin, true);
        assert.strictEqual(u.mustResetPassword, true);
        assert.strictEqual(u.bio, 'hi', 'profile fields preserved');
    });

    // ---------------------------------------------------------------
    // 4. isAdminRequest
    // ---------------------------------------------------------------
    await test('isAdminRequest: admin JWT -> true', () => {
        const t = auth.signToken({ sub: 'm1', is_admin: true });
        assert.strictEqual(auth.isAdminRequest({ headers: { authorization: 'Bearer ' + t } }), true);
    });
    await test('isAdminRequest: member JWT -> false', () => {
        const t = auth.signToken({ sub: 'm2', is_admin: false });
        assert.strictEqual(auth.isAdminRequest({ headers: { authorization: 'Bearer ' + t } }), false);
    });
    await test('isAdminRequest: shared ADMIN_TOKEN header -> true', () => {
        assert.strictEqual(auth.isAdminRequest({ headers: { 'x-admin-token': 'shared-admin-secret' } }), true);
    });
    await test('isAdminRequest: no creds -> false', () => {
        assert.strictEqual(auth.isAdminRequest({ headers: {} }), false);
    });
    await test('getBearerToken reads cookie fallback', () => {
        const t = auth.signToken({ sub: 'm1' });
        const got = auth.getBearerToken({ headers: { cookie: 'foo=bar; fvn_session=' + encodeURIComponent(t) } });
        assert.strictEqual(got, t);
    });

    // ---------------------------------------------------------------
    // 5. auth-login handler
    // ---------------------------------------------------------------
    const login = loadFresh(loginPath);
    const knownHash = await auth.hashPassword('CorrectHorse1!');

    function invokeLogin(body) {
        return login.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) });
    }

    await test('auth-login success returns token + hash-free user', async () => {
        nextRows = [{
            id: 'm-100', email: 'admin@advancedmarketing.co', password_hash: knownHash,
            first_name: 'Ben', last_name: 'Boyce', is_admin: true, member_type: 'owner'
        }];
        const res = await invokeLogin({ email: 'Admin@AdvancedMarketing.co', password: 'CorrectHorse1!' });
        assert.strictEqual(res.statusCode, 200);
        const body = JSON.parse(res.body);
        assert.ok(body.token, 'token returned');
        assert.ok(body.user, 'user returned');
        assert.strictEqual(body.user.password_hash, undefined, 'no hash in response');
        assert.ok(!res.body.includes(knownHash), 'hash never appears anywhere in body');
        assert.strictEqual(body.user.is_admin, true);
        // token must verify and carry the member id + admin flag
        const claims = auth.verifyToken(body.token);
        assert.strictEqual(claims.sub, 'm-100');
        assert.strictEqual(claims.is_admin, true);
        // email lookup was lower-cased and bound as a parameter
        const lookupCall = calls.find(call => Array.from(call.strings).join(' ').includes('SELECT * FROM members WHERE LOWER(email)'));
        assert.deepStrictEqual(lookupCall.values, ['admin@advancedmarketing.co']);
        assert.ok(calls.some(call => Array.from(call.strings).join(' ').includes('login_count = COALESCE(login_count, 0) + 1')), 'successful login is tracked');
    });

    await test('auth-login wrong password -> generic 401', async () => {
        nextRows = [{ id: 'm-100', email: 'a@b.co', password_hash: knownHash, first_name: 'A', last_name: 'B' }];
        const res = await invokeLogin({ email: 'a@b.co', password: 'nope' });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(JSON.parse(res.body).error, 'Invalid email or password');
    });

    await test('auth-login unknown email -> same generic 401', async () => {
        nextRows = []; // no such member
        const res = await invokeLogin({ email: 'ghost@b.co', password: 'whatever' });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(JSON.parse(res.body).error, 'Invalid email or password');
    });

    await test('auth-login missing fields -> 400', async () => {
        const res = await invokeLogin({ email: '', password: '' });
        assert.strictEqual(res.statusCode, 400);
    });

    // ---------------------------------------------------------------
    // 5b. auth-change-password handler
    // ---------------------------------------------------------------
    const changePassword = loadFresh(changePasswordPath);
    const memberJwtForPasswordChange = auth.signToken({ sub: 'm-101', email: 'member@b.co', is_admin: false, must_reset_password: false });
    function invokeChangePassword(body, token = memberJwtForPasswordChange) {
        return changePassword.handler({
            httpMethod: 'POST',
            headers: { authorization: 'Bearer ' + token },
            body: JSON.stringify(body)
        });
    }

    await test('auth-change-password requires current password for normal accounts', async () => {
        nextRows = [{ id: 'm-101', email: 'member@b.co', password_hash: knownHash, must_reset_password: false, account_status: 'active' }];
        const res = await invokeChangePassword({ password: 'NewSecure123!' });
        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(JSON.parse(res.body).error, 'Current password is required.');
    });

    await test('auth-change-password rejects wrong current password', async () => {
        nextRows = [{ id: 'm-101', email: 'member@b.co', password_hash: knownHash, must_reset_password: false, account_status: 'active' }];
        const res = await invokeChangePassword({ currentPassword: 'WrongPassword123!', password: 'NewSecure123!' });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(JSON.parse(res.body).error, 'Current password is incorrect.');
    });

    await test('auth-change-password accepts correct current password', async () => {
        nextRows = [{ id: 'm-101', email: 'member@b.co', password_hash: knownHash, first_name: 'M', last_name: 'B', must_reset_password: false, account_status: 'active' }];
        const res = await invokeChangePassword({ currentPassword: 'CorrectHorse1!', password: 'NewSecure123!' });
        assert.strictEqual(res.statusCode, 200);
        const body = JSON.parse(res.body);
        assert.ok(body.token);
        assert.strictEqual(body.user.password_hash, undefined);
        const update = calls.find(c => c.strings.join(' ').includes('UPDATE members SET password_hash'));
        assert.ok(update, 'password update ran');
    });

    // ---------------------------------------------------------------
    // 6. db-api gating (admin JWT vs member JWT vs member actions)
    // ---------------------------------------------------------------
    const api = loadFresh(dbApiPath);
    const adminJwt = auth.signToken({ sub: 'admin-1', email: 'a@b.co', is_admin: true });
    const memberJwt = auth.signToken({ sub: 'member-9', email: 'm@b.co', is_admin: false });

    function invoke(action, { payload = {}, headers = {} } = {}) {
        return api.handler({ httpMethod: 'POST', headers, body: JSON.stringify({ action, payload }) });
    }

    await test('db-api admin action allowed with admin JWT', async () => {
        nextRows = [{ id: 'app1' }];
        const res = await invoke('applications.list', { headers: { authorization: 'Bearer ' + adminJwt } });
        assert.strictEqual(res.statusCode, 200);
    });

    await test('db-api admin action rejected with member JWT', async () => {
        const res = await invoke('applications.list', { headers: { authorization: 'Bearer ' + memberJwt } });
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(calls.length, 0, 'no SQL runs when unauthorized');
    });

    await test('db-api admin action still works with shared ADMIN_TOKEN', async () => {
        nextRows = [{ id: 'app1' }];
        const res = await invoke('applications.list', { headers: { 'x-admin-token': 'shared-admin-secret' } });
        assert.strictEqual(res.statusCode, 200);
    });

    await test('member action rejected without any token', async () => {
        const res = await invoke('messages.inbox', {});
        assert.strictEqual(res.statusCode, 401);
    });

    await test('member action allowed with member JWT', async () => {
        nextRows = []; // no messages
        const res = await invoke('messages.inbox', { headers: { authorization: 'Bearer ' + memberJwt } });
        assert.strictEqual(res.statusCode, 200);
    });

    await test('messages.send derives sender from JWT, not from the client body', async () => {
        nextRows = [{ id: 'msg1', from_member: 'member-9', to_member: 'other-2', body: 'hi' }];
        const res = await invoke('messages.send', {
            headers: { authorization: 'Bearer ' + memberJwt },
            // Client tries to spoof a different sender — must be IGNORED.
            payload: { from: 'someone-else', fromId: 'someone-else', toId: 'other-2', body: 'hi' }
        });
        assert.strictEqual(res.statusCode, 200);
        // The INSERT must bind the token's sub ('member-9') as the sender.
        const insert = calls.find(c => c.strings.join(' ').includes('INSERT INTO messages'));
        assert.ok(insert, 'insert ran');
        assert.strictEqual(insert.values[0], 'member-9', 'from_member = token sub');
        assert.strictEqual(insert.values[1], 'other-2', 'to_member = payload toId');
        assert.ok(!insert.values.includes('someone-else'), 'spoofed sender never used');
    });

    await test('messages.send to self -> 500 error (rejected)', async () => {
        const res = await invoke('messages.send', {
            headers: { authorization: 'Bearer ' + memberJwt },
            payload: { toId: 'member-9', body: 'hi' }
        });
        assert.strictEqual(res.statusCode, 500); // handler throws -> query failed
    });

    console.log(`\nAll ${passed} auth tests passed.`);
})().catch(e => {
    console.error('\nTEST FAILED:', e.message);
    console.error(e.stack);
    process.exit(1);
});
