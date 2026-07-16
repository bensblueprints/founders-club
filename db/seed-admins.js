#!/usr/bin/env node
// ============================================================
// FoundersVN — seed admin + sample member accounts into Neon.
//
//   DATABASE_URL=postgres://...  node db/seed-admins.js
//
// Upserts the 4 admin accounts (idempotent on email) with bcrypt-hashed
// passwords and is_admin=true, plus clearly-marked sample members and event
// applications so the directory and admin review queue are useful immediately.
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
    {
        email: 'sample.minh@foundersvn.example', firstName: 'Minh', lastName: 'Nguyen (sample)',
        age: 35, company: 'VietTech Solutions', role: 'Founder & CEO', industry: 'saas', memberType: 'founding',
        bio: 'Building practical workflow software for service businesses across Vietnam. Happy to compare notes on B2B sales, product operations, and regional expansion.',
        website: 'https://viettech.example', websites: ['https://viettech.example', 'https://minh-builds.example'],
        whatsapp: '+84 912 345 678', zalo: 'minh-nguyen-sample', telegram: '@minhbuilds_sample',
        linkedin: 'https://www.linkedin.com/in/sample-minh-nguyen', twitter: '@minhbuilds_sample',
        facebook: 'https://facebook.com/sample.minh.nguyen', instagram: '@minhbuilds.sample',
        socialLink: 'https://www.linkedin.com/in/sample-minh-nguyen'
    },
    {
        email: 'sample.sarah@foundersvn.example', firstName: 'Sarah', lastName: 'Chen (sample)',
        age: 33, company: 'GreenLeaf Commerce', role: 'Co-Founder', industry: 'ecommerce', memberType: 'platinum_founding',
        bio: 'Co-founder of a sustainable consumer commerce company. Interested in supply-chain innovation, brand building, and meeting operators growing across Southeast Asia.',
        website: 'https://greenleaf.example', websites: ['https://greenleaf.example'],
        whatsapp: '+84 903 456 789', zalo: 'sarah-chen-sample', telegram: '@sarahgreen_sample',
        linkedin: 'https://www.linkedin.com/in/sample-sarah-chen', twitter: '@sarahgreen_sample',
        wechat: 'sarahchen_sample', instagram: '@greenleaf.sample',
        socialLink: 'https://www.linkedin.com/in/sample-sarah-chen'
    }
];

// These use reserved .example addresses and are safe to seed repeatedly. Minh's
// row deliberately matches SAMPLE_MEMBERS to exercise the existing-account
// registration path; approving it must preserve Minh's account and password.
const SAMPLE_APPLICATIONS = [
    {
        eventSlug: 'danang-jul-2026',
        email: 'applicant.linh@foundersvn.example', firstName: 'Linh', lastName: 'Tran (sample)',
        company: 'Northstar Studio', role: 'Co-Founder & COO', industry: 'Agency / Services, Media / Creative',
        age: 32, revenue: '$500k–$1m', teamSize: '11–25', ticketCount: 2,
        guestName: 'Quang Le (sample)', socialLink: 'https://www.linkedin.com/in/sample-linh-tran',
        companyLink: 'https://northstar.example', lookingFor: 'Customers / Clients, Partnerships',
        canOffer: 'Introductions, Product feedback', whatYouDo: 'We help early-stage teams turn complex products into clear brands and launch campaigns.',
        biggestChallenge: 'Building a repeatable regional sales pipeline without losing delivery quality.',
        uniqueValue: 'A tested launch playbook and a strong operator network across Vietnam.',
        goals: 'Expand into two regional markets and hire a senior growth lead.',
        whyJoin: 'Meet founders facing similar scaling decisions and form practical partnerships.',
        referral: 'Member referral', referrerName: 'Minh Nguyen', membershipType: 'event', language: 'English'
    },
    {
        eventSlug: 'hcmc-aug-2026',
        email: 'applicant.david@foundersvn.example', firstName: 'David', lastName: 'Pham (sample)',
        company: 'LedgerFox', role: 'Founder & CEO', industry: 'Tech / SaaS, Finance',
        age: 38, revenue: '$1m–$5m', teamSize: '26–50', ticketCount: 1,
        socialLink: 'https://www.linkedin.com/in/sample-david-pham', companyLink: 'https://ledgerfox.example',
        lookingFor: 'Investment, Talent / Hiring', canOffer: 'Expertise / Advice, Introductions',
        whatYouDo: 'LedgerFox automates reconciliation and cash visibility for multi-entity businesses.',
        biggestChallenge: 'Hiring senior product leaders while expanding into Southeast Asia.',
        uniqueValue: 'Deep fintech operating experience and access to regional finance teams.',
        goals: 'Close a Series A and launch in Singapore.', whyJoin: 'Build trusted relationships beyond transactional networking.',
        referral: 'FoundersVN website', membershipType: 'event', language: 'English'
    },
    {
        eventSlug: 'hcmc-aug-2026',
        email: 'sample.minh@foundersvn.example', firstName: 'Minh', lastName: 'Nguyen (sample)',
        company: 'VietTech Solutions', role: 'Founder & CEO', industry: 'Tech / SaaS',
        ticketCount: 1, socialLink: 'https://www.linkedin.com/in/sample-minh-nguyen',
        companyLink: 'https://viettech.example', lookingFor: 'Partnerships, Customers / Clients',
        canOffer: 'Expertise / Advice, Introductions',
        whatYouDo: 'Building workflow software for Vietnamese service businesses.',
        whyJoin: 'Registering for the next event from an existing member account.',
        referral: 'Existing member', membershipType: 'member_event_registration', language: 'English'
    }
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
            (email, password_hash, first_name, last_name, age, company, role, industry,
             bio, website, websites, whatsapp, zalo, telegram, linkedin, twitter,
             wechat, facebook, instagram, social_link,
             is_approved, is_admin, member_type, must_reset_password, account_status)
        VALUES
            (${email}, ${hash}, ${acc.firstName}, ${acc.lastName || ''}, ${acc.age || null},
             ${acc.company || null}, ${acc.role || null}, ${acc.industry || null},
             ${acc.bio || null}, ${acc.website || null}, ${JSON.stringify(acc.websites || [])}::jsonb,
             ${acc.whatsapp || null}, ${acc.zalo || null}, ${acc.telegram || null},
             ${acc.linkedin || null}, ${acc.twitter || null}, ${acc.wechat || null},
             ${acc.facebook || null}, ${acc.instagram || null}, ${acc.socialLink || null},
             true, ${isAdmin}, ${acc.memberType}, ${isAdmin}, 'active')
        ON CONFLICT (email) DO UPDATE SET
            password_hash       = EXCLUDED.password_hash,
            first_name          = EXCLUDED.first_name,
            last_name           = EXCLUDED.last_name,
            age                 = CASE WHEN EXCLUDED.is_admin THEN members.age ELSE EXCLUDED.age END,
            company             = EXCLUDED.company,
            role                = EXCLUDED.role,
            industry            = EXCLUDED.industry,
            bio                 = CASE WHEN EXCLUDED.is_admin THEN members.bio ELSE EXCLUDED.bio END,
            website             = CASE WHEN EXCLUDED.is_admin THEN members.website ELSE EXCLUDED.website END,
            websites            = CASE WHEN EXCLUDED.is_admin THEN members.websites ELSE EXCLUDED.websites END,
            whatsapp            = CASE WHEN EXCLUDED.is_admin THEN members.whatsapp ELSE EXCLUDED.whatsapp END,
            zalo                = CASE WHEN EXCLUDED.is_admin THEN members.zalo ELSE EXCLUDED.zalo END,
            telegram            = CASE WHEN EXCLUDED.is_admin THEN members.telegram ELSE EXCLUDED.telegram END,
            linkedin            = CASE WHEN EXCLUDED.is_admin THEN members.linkedin ELSE EXCLUDED.linkedin END,
            twitter             = CASE WHEN EXCLUDED.is_admin THEN members.twitter ELSE EXCLUDED.twitter END,
            wechat              = CASE WHEN EXCLUDED.is_admin THEN members.wechat ELSE EXCLUDED.wechat END,
            facebook            = CASE WHEN EXCLUDED.is_admin THEN members.facebook ELSE EXCLUDED.facebook END,
            instagram           = CASE WHEN EXCLUDED.is_admin THEN members.instagram ELSE EXCLUDED.instagram END,
            social_link         = CASE WHEN EXCLUDED.is_admin THEN members.social_link ELSE EXCLUDED.social_link END,
            is_approved         = true,
            is_admin            = EXCLUDED.is_admin,
            member_type         = EXCLUDED.member_type,
            must_reset_password = EXCLUDED.must_reset_password,
            account_status      = 'active'`;

    return { email, plain, generated };
}

async function seedApplications() {
    let seeded = 0;
    for (const app of SAMPLE_APPLICATIONS) {
        const rows = await sql`
            INSERT INTO applications
                (event_id, first_name, last_name, email, age, social_link, company, role,
                 industry, revenue, team_size, biggest_challenge, unique_value,
                 goals_12_month, why_join, referral, referrer_name, event_interest,
                 membership_type, company_link, looking_for, can_offer, what_you_do,
                 page_language, event, ticket_count, guest_name, status)
            SELECT e.id, ${app.firstName}, ${app.lastName}, ${app.email.toLowerCase()},
                   ${app.age || null}, ${app.socialLink || null}, ${app.company || null},
                   ${app.role || null}, ${app.industry || null}, ${app.revenue || null},
                   ${app.teamSize || null}, ${app.biggestChallenge || null},
                   ${app.uniqueValue || null}, ${app.goals || null}, ${app.whyJoin || null},
                   ${app.referral || null}, ${app.referrerName || null}, ${app.eventSlug},
                   ${app.membershipType || 'event'}, ${app.companyLink || null},
                   ${app.lookingFor || null}, ${app.canOffer || null}, ${app.whatYouDo || null},
                   ${app.language || 'English'}, e.name, ${app.ticketCount || 1},
                   ${app.guestName || null}, 'pending'
            FROM events e WHERE e.slug = ${app.eventSlug}
              AND NOT EXISTS (
                  SELECT 1 FROM applications existing
                  WHERE existing.event_id = e.id
                    AND LOWER(existing.email) = LOWER(${app.email})
                    AND existing.status IN ('pending', 'approved')
              )
            RETURNING id`;
        seeded += rows.length;
    }
    return seeded;
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

    const applicationsAdded = await seedApplications();

    console.log('Done. Accounts upserted (idempotent on email).\n');
    console.log('=== CREDENTIALS (store securely, then have each user change their password) ===');
    for (const p of printed) {
        const note = p.generated ? ' (generated)' : ' (from env)';
        console.log(`${p.role.padEnd(6)} ${p.email.padEnd(38)} ${p.password}${note}`);
    }
    console.log('\nNOTE: password hashes are stored in Neon and are NEVER printed above.');
    console.log(`Sample applications ready for admin review (${applicationsAdded} newly added, ${SAMPLE_APPLICATIONS.length} total fixtures).`);
    process.exit(0);
})().catch(e => {
    console.error('SEED FAILED:', e.message);
    console.error(e.stack);
    process.exit(1);
});
