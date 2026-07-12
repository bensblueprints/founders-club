#!/usr/bin/env node
// ============================================================
// FoundersVN — seed admin + sample member accounts into Neon.
//
//   DATABASE_URL=postgres://...  node db/seed-admins.js
//
// Upserts the 4 admin accounts (idempotent on email) with bcrypt-hashed
// passwords and is_admin=true, plus a couple of clearly-sample APPROVED members
// so the directory isn't empty on first load.
//
// Passwords: for each account, the password is read from its env var if set,
// otherwise a strong random one is GENERATED and PRINTED. The bcrypt HASH is
// NEVER printed or logged. Run this once; store the printed passwords in your
// password manager, then have each admin change theirs.
//
// Requires: DATABASE_URL, and the schema from db/neon-schema.sql + db/auth-schema.sql
// already applied.
// ============================================================

const crypto = require('crypto');
const path = require('path');

// Reuse the shared helpers (bcrypt + Neon client).
const { hashPassword } = require(path.join(__dirname, '..', 'netlify', 'functions', 'lib', 'auth.js'));
const { sql, isConfigured } = require(path.join(__dirname, '..', 'netlify', 'functions', 'lib', 'neon.js'));

// Accounts to seed. Password comes from `envVar` if present, else generated.
const ADMINS = [
    { email: 'admin@advancedmarketing.co',    firstName: 'Benjamin', lastName: 'Boyce', company: 'Advanced Marketing', role: 'Founder',    memberType: 'owner', envVar: 'SEED_PW_BEN' },
    
    
    
];

// Sample APPROVED members (clearly fake) so the member directory has content.
// Password from SEED_PW_SAMPLE (shared) or generated per account.
const SAMPLE_MEMBERS = [
    { email: 'sample.minh@foundersvn.example',  firstName: 'Minh',  lastName: 'Nguyen (sample)', company: 'VietTech Solutions', role: 'Founder & CEO', industry: 'saas',      memberType: 'founding' },
    { email: 'sample.sarah@foundersvn.example', firstName: 'Sarah', lastName: 'Chen (sample)',   company: 'GreenLeaf Commerce', role: 'Co-Founder',   industry: 'ecommerce', memberType: 'platinum_founding' }
];

function genPassword() {
    // 18 url-safe chars + a symbol/number to satisfy typical complexity rules.
    return crypto.randomBytes(14).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 16) + 'A9!';
}

async function upsertMember(acc, { isAdmin, sampleSharedPw }) {
    // Resolve the plaintext password.
    let plain = acc.envVar && process.env[acc.envVar];
    let generated = false;
    if (!plain && sampleSharedPw) plain = sampleSharedPw;
    if (!plain) { plain = genPassword(); generated = true; }

    const hash = await hashPassword(plain); // bcrypt — never printed.
    const email = acc.email.toLowerCase();

    await sql`
        INSERT INTO members
            (email, password_hash, first_name, last_name, company, role, industry,
             is_approved, is_admin, member_type, must_reset_password)
        VALUES
            (${email}, ${hash}, ${acc.firstName}, ${acc.lastName || ''}, ${acc.company || null},
             ${acc.role || null}, ${acc.industry || null}, true, ${isAdmin}, ${acc.memberType},
             ${isAdmin})
        ON CONFLICT (email) DO UPDATE SET
            password_hash       = EXCLUDED.password_hash,
            first_name          = EXCLUDED.first_name,
            last_name           = EXCLUDED.last_name,
            company             = EXCLUDED.company,
            role                = EXCLUDED.role,
            industry            = EXCLUDED.industry,
            is_approved         = true,
            is_admin            = EXCLUDED.is_admin,
            member_type         = EXCLUDED.member_type,
            must_reset_password = EXCLUDED.must_reset_password`;

    return { email, plain, generated };
}

(async () => {
    if (!isConfigured()) {
        console.error('ERROR: DATABASE_URL is not set. Run with DATABASE_URL=postgres://... node db/seed-admins.js');
        process.exit(1);
    }

    console.log('Seeding admin + sample accounts into Neon...\n');
    const printed = [];

    for (const acc of ADMINS) {
        const r = await upsertMember(acc, { isAdmin: true });
        printed.push({ role: 'ADMIN', email: r.email, password: r.plain, generated: r.generated });
    }

    const sampleShared = process.env.SEED_PW_SAMPLE || null;
    for (const acc of SAMPLE_MEMBERS) {
        const r = await upsertMember(acc, { isAdmin: false, sampleSharedPw: sampleShared });
        printed.push({ role: 'MEMBER', email: r.email, password: r.plain, generated: r.generated });
    }

    console.log('Done. Accounts upserted (idempotent on email).\n');
    console.log('=== CREDENTIALS (store securely, then have each user change their password) ===');
    for (const p of printed) {
        const note = p.generated ? ' (generated)' : ' (from env)';
        console.log(`${p.role.padEnd(6)} ${p.email.padEnd(38)} ${p.password}${note}`);
    }
    console.log('\nNOTE: password hashes are stored in Neon and are NEVER printed above.');
    process.exit(0);
})().catch(e => {
    console.error('SEED FAILED:', e.message);
    console.error(e.stack);
    process.exit(1);
});
