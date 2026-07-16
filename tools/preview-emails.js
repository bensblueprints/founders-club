#!/usr/bin/env node

process.env.EMAIL_PREVIEW_INLINE_ASSETS = 'true';
process.env.URL = process.env.URL || 'https://foundersvn.com';

const fs = require('fs');
const path = require('path');
const {
    approvedWithLoginEmail,
    reminderEmail,
    expiredEmail,
    paymentConfirmedEmail,
    notificationEmail
} = require('../netlify/functions/lib/emailer');

const outDir = path.join(process.cwd(), 'tmp', 'email-previews');
fs.mkdirSync(outDir, { recursive: true });

const event = {
    name: 'FoundersVN Da Nang',
    date: 'Friday, July 31, 2026',
    time: '18:00',
    location: 'FOR YOU SteakHouse, Da Nang',
    price: '$150.00 USD for 1 ticket'
};

const samples = {
    approval: approvedWithLoginEmail({
        firstName: 'Jane',
        email: 'jane@example.com',
        tempPassword: 'Temp123456!',
        loginUrl: 'https://foundersvn.com/login',
        paymentUrl: 'https://foundersvn.com/payment?order=preview-order',
        expiresAt: '2026-07-17T11:00:00Z',
        ticketCount: 1,
        existingAccount: false,
        event
    }),
    'reminder-24h': reminderEmail({
        firstName: 'Jane',
        paymentUrl: 'https://foundersvn.com/payment?order=preview-order',
        hoursLeft: 24,
        reminderKind: 'initial',
        event
    }),
    'reminder-6h': reminderEmail({
        firstName: 'Jane',
        paymentUrl: 'https://foundersvn.com/payment?order=preview-order',
        hoursLeft: 6,
        reminderKind: 'final',
        event
    }),
    confirmed: paymentConfirmedEmail({
        firstName: 'Jane',
        email: 'jane@example.com',
        mealUrl: 'https://foundersvn.com/meal',
        appUrl: 'https://foundersvn.com/login',
        profileUrl: 'https://foundersvn.com/profile',
        receiptUrl: 'https://foundersvn.com/payment?order=preview-order',
        paymentMethod: 'SePay / VietQR bank transfer',
        ticketCount: 2,
        event
    }),
    expired: expiredEmail({
        firstName: 'Jane',
        existingAccount: false,
        event
    }),
    notification: notificationEmail({
        adminUrl: 'https://foundersvn.com/admin',
        app: {
            first_name: 'Jane',
            last_name: 'Nguyen',
            email: 'jane@example.com',
            company: 'Acme Studio',
            role: 'Founder',
            company_link: 'https://example.com',
            industry: 'Tech / SaaS',
            looking_for: 'Customers / Clients',
            can_offer: 'Introductions',
            what_you_do: 'Building founder tools',
            social_link: '+84 901 234 567',
            event: 'FoundersVN Da Nang',
            page_language: 'en'
        }
    })
};

const selected = process.argv[2];
const keys = selected ? [selected] : Object.keys(samples);

for (const key of keys) {
    if (!samples[key]) {
        console.error(`Unknown email preview "${key}". Choose one of: ${Object.keys(samples).join(', ')}`);
        process.exitCode = 1;
        continue;
    }
    const file = path.join(outDir, `${key}.html`);
    fs.writeFileSync(file, samples[key].html);
    console.log(`${key}: ${file}`);
    console.log(`  subject: ${samples[key].subject}`);
}
