# Founders Vietnam

The application is now a Next.js App Router project. The React UI, authenticated
navigation, public pages, member directory, messages, profile, admin review, and
payment entry points run from one application. The existing tested database and
workflow functions are exposed through Next route handlers under
`/api/function/*`.

## Local development

Requirements: Node.js, npm, and Docker.

```bash
cp .env.example .env.local
npm install
npm run stack:dev
```

`stack:dev` starts PostgreSQL, applies migrations, seeds local accounts, and
opens the Next.js app at <http://localhost:3000>.

For real sandbox webhooks, start the same stack with an automatic public HTTPS
tunnel:

```bash
npm run stack:dev:public
```

The command prints the public website, Airwallex webhook, SePay webhook, and
Resend webhook URLs, then persists those three webhook URLs into `.env.local`.
Keep it running while testing. Public tunnel URLs change after each restart, so
update the provider dashboards when a new URL is printed.

Local development uses real provider sandboxes (`PAYMENTS_ENV=sandbox`). Set
`PAYMENT_PROVIDERS=sepay` to run without Airwallex, or use
`PAYMENT_PROVIDERS=airwallex,sepay` after both merchant capabilities are enabled.
Fill the matching provider values in `.env.local`, expose
the local server with an HTTPS tunnel, then configure these webhook URLs:

- `https://YOUR-TUNNEL/api/function/airwallex-webhook`
- `https://YOUR-TUNNEL/api/function/sepay-webhook`
- `https://YOUR-TUNNEL/api/function/resend-webhook`

In Airwallex demo, subscribe to `payment_intent.succeeded`. In SePay Test mode,
create a simulated bank account, configure HMAC-SHA256 authentication and the
`FVN` payment-code prefix, then simulate an incoming transfer using the exact
amount and payment code shown on the payment page. In Resend, subscribe to
delivery/open/click events and copy the webhook signing secret into
`RESEND_WEBHOOK_SECRET`.

Validate credentials without creating a payment:

```bash
npm run payments:check
```

Local admin:

- Email: `admin@advancedmarketing.co`
- Password: `LocalAdmin123!`

## Verification

```bash
npm run check
npm run stack:test
```

`npm run check` runs a production Next build and the unit tests. `stack:test`
also starts the local database and runs the complete database integration flow.

## Deployment

Set the variables documented in `.env.example` in the deployment environment.
Production must explicitly set `PAYMENTS_ENV=production`, choose its
`PAYMENT_PROVIDERS`, replace the enabled provider variables with live credentials, use the Neon
`DATABASE_URL`, and set strong unique values for `SESSION_SECRET`,
`ADMIN_TOKEN`, and `DATA_ENCRYPTION_KEY`. Mock settlement is only enabled when
`PAYMENTS_ENV=mock` (the automated test environment).

For Netlify's `.env` import flow, copy `prod.env.example` to `prod.env`, fill the
blank values, and import `prod.env` in the Netlify UI. The production webhook
URLs are prefilled:

- `https://foundersvn.com/api/function/airwallex-webhook`
- `https://foundersvn.com/api/function/sepay-webhook`
- `https://foundersvn.com/api/function/resend-webhook`
