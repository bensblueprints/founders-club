#!/usr/bin/env node
// Create or update exactly one admin account.
//
// Safe production usage through Netlify env:
//   npx netlify env:exec -- npm run admin:create -- --email founder@example.com --first-name Founder --last-name VN
//
// Optional env/args:
//   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME,
//   ADMIN_COMPANY, ADMIN_JOB_TITLE, ADMIN_MEMBER_TYPE

const path = require('path');

const { hashPassword, generateTempPassword } = require(path.join(__dirname, '..', 'netlify', 'functions', 'lib', 'auth.js'));
const { sql, isConfigured } = require(path.join(__dirname, '..', 'netlify', 'functions', 'lib', 'neon.js'));

function readArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (!arg.startsWith('--')) continue;
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
            out[key] = true;
        } else {
            out[key] = next;
            i += 1;
        }
    }
    return out;
}

function pick(args, argName, envName, fallback = '') {
    return String(args[argName] || process.env[envName] || fallback).trim();
}

function die(message) {
    console.error(`ERROR: ${message}`);
    process.exit(1);
}

(async () => {
    if (!isConfigured()) {
        die('DATABASE_URL is not set. Use Netlify env:exec or export DATABASE_URL before running this script.');
    }

    const args = readArgs(process.argv.slice(2));
    const email = pick(args, 'email', 'ADMIN_EMAIL').toLowerCase();
    const firstName = pick(args, 'first-name', 'ADMIN_FIRST_NAME', 'Admin');
    const lastName = pick(args, 'last-name', 'ADMIN_LAST_NAME', 'User');
    const company = pick(args, 'company', 'ADMIN_COMPANY', 'Founders Vietnam');
    const jobTitle = pick(args, 'job-title', 'ADMIN_JOB_TITLE', 'Admin');
    const memberType = pick(args, 'member-type', 'ADMIN_MEMBER_TYPE', args.owner ? 'owner' : 'admin');
    const providedPassword = pick(args, 'password', 'ADMIN_PASSWORD');
    const password = providedPassword || generateTempPassword(16);

    if (!email || !email.includes('@')) die('Provide a valid admin email with --email or ADMIN_EMAIL.');
    if (!['owner', 'admin', 'organiser'].includes(memberType)) {
        die('ADMIN_MEMBER_TYPE / --member-type must be one of: owner, admin, organiser.');
    }

    const passwordHash = await hashPassword(password);

    const rows = await sql`
        INSERT INTO members
            (email, password_hash, first_name, last_name, company, role,
             is_approved, is_admin, member_type, must_reset_password, account_status, updated_at)
        VALUES
            (${email}, ${passwordHash}, ${firstName}, ${lastName}, ${company}, ${jobTitle},
             true, true, ${memberType}, true, 'active', NOW())
        ON CONFLICT (email) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            company = EXCLUDED.company,
            role = EXCLUDED.role,
            is_approved = true,
            is_admin = true,
            member_type = EXCLUDED.member_type,
            must_reset_password = true,
            account_status = 'active',
            updated_at = NOW()
        RETURNING id, email, first_name, last_name, member_type, must_reset_password`;

    const admin = rows[0];
    console.log('Admin account is ready.');
    console.log(`id: ${admin.id}`);
    console.log(`email: ${admin.email}`);
    console.log(`name: ${admin.first_name} ${admin.last_name}`);
    console.log(`member_type: ${admin.member_type}`);
    console.log(`must_reset_password: ${admin.must_reset_password}`);
    if (providedPassword) {
        console.log('password: set from ADMIN_PASSWORD / --password');
    } else {
        console.log(`temporary_password: ${password}`);
        console.log('Store this now. It will not be shown again.');
    }
})().catch((error) => {
    console.error('CREATE ADMIN FAILED:', error.message);
    process.exit(1);
});
