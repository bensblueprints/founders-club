// Shared Airwallex helper — auth + payment-link creation.
// Mirrors the auth/create pattern in create-payment.js so all functions share one code path.

const { paymentEnvironment, isMockPayments } = require('./payment-environment');

function config() {
    const environment = paymentEnvironment();
    const legacyEnvValue = String(process.env.AIRWALLEX_ENV || '').trim();
    const legacyEnvLooksLikeApiKey = legacyEnvValue && !['sandbox', 'demo', 'production', 'prod'].includes(legacyEnvValue.toLowerCase());
    return {
        environment,
        // Backward compatibility: the Netlify project previously stored the
        // live Airwallex production API key in AIRWALLEX_ENV. Prefer it only
        // when it is clearly not an environment label.
        apiKey: legacyEnvLooksLikeApiKey ? legacyEnvValue : (process.env.AIRWALLEX_API_KEY || ''),
        clientId: process.env.AIRWALLEX_CLIENT_ID || '',
        webhookSecret: process.env.AIRWALLEX_WEBHOOK_SECRET || '',
        baseUrl: environment === 'production'
            ? 'https://api.airwallex.com'
            : 'https://api-demo.airwallex.com'
    };
}

function describeSecret(value) {
    const text = String(value || '');
    if (!text) return { present: false, length: 0 };
    return {
        present: true,
        length: text.length,
        prefix: text.slice(0, 4),
        suffix: text.slice(-4)
    };
}

function diagnostics() {
    const c = config();
    const legacyEnvValue = String(process.env.AIRWALLEX_ENV || '').trim();
    const legacyEnvLooksLikeApiKey = legacyEnvValue && !['sandbox', 'demo', 'production', 'prod'].includes(legacyEnvValue.toLowerCase());
    return {
        environment: c.environment,
        baseUrl: c.baseUrl,
        configured: isConfigured(),
        source: legacyEnvLooksLikeApiKey ? 'AIRWALLEX_ENV_LEGACY_API_KEY' : 'AIRWALLEX_API_KEY',
        envKeys: {
            AIRWALLEX_API_KEY: describeSecret(process.env.AIRWALLEX_API_KEY),
            AIRWALLEX_CLIENT_ID: describeSecret(process.env.AIRWALLEX_CLIENT_ID),
            AIRWALLEX_WEBHOOK_SECRET: describeSecret(process.env.AIRWALLEX_WEBHOOK_SECRET),
            AIRWALLEX_ENV: describeSecret(process.env.AIRWALLEX_ENV)
        },
        resolved: {
            apiKey: describeSecret(c.apiKey),
            clientId: describeSecret(c.clientId),
            webhookSecret: describeSecret(c.webhookSecret)
        },
        missing: [
            c.apiKey ? null : 'AIRWALLEX_API_KEY',
            c.clientId ? null : 'AIRWALLEX_CLIENT_ID',
            c.webhookSecret ? null : 'AIRWALLEX_WEBHOOK_SECRET'
        ].filter(Boolean)
    };
}

function isConfigured() {
    if (isMockPayments()) return true;
    const c = config();
    return Boolean(c.apiKey && c.clientId && c.webhookSecret);
}

// Log in and return a bearer access token (same endpoint create-payment.js uses).
async function getAccessToken() {
    const c = config();
    if (!c.apiKey || !c.clientId) throw new Error(`Airwallex ${c.environment} credentials are not configured`);
    const res = await fetch(`${c.baseUrl}/api/v1/authentication/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': c.apiKey,
            'x-client-id': c.clientId
        }
    });
    if (!res.ok) {
        const details = await res.text();
        throw new Error(`Airwallex auth failed: ${details}`);
    }
    const data = await res.json();
    return data.token;
}

// Create a hosted Airwallex Payment Link (an emailable URL, unlike a bare payment_intent).
// Returns { id, url }. Mock links are available only when PAYMENTS_ENV=mock.
async function createPaymentLink({ amount, currency = 'USD', title, description, reference, metadata = {}, expiresAt, requestId }) {
    if (isMockPayments()) {
        const mockId = `mock-link-${requestId || Date.now()}`;
        return {
            id: mockId,
            url: `${process.env.URL || 'http://localhost:3000'}/payment-success?mock=1&order=${requestId || mockId}`,
            mock: true
        };
    }
    if (!isConfigured()) throw new Error(`Airwallex ${config().environment} is not fully configured`);

    const token = await getAccessToken();

    const payload = {
        amount,
        currency: currency.toUpperCase(),
        title: title || 'FoundersVN',
        description: description || '',
        reusable: false,
        request_id: requestId || `plink-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        metadata
    };
    if (reference) payload.reference = reference;
    if (expiresAt) payload.expires_at = expiresAt; // ISO string

    const res = await fetch(`${config().baseUrl}/api/v1/pa/payment_links/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const details = await res.text();
        throw new Error(`Airwallex payment-link create failed: ${details}`);
    }

    const data = await res.json();
    return { id: data.id, url: data.url, raw: data };
}

// Vietnamese sandbox merchants use the Online Payments Hosted Payment Page.
// Payment Links have a narrower merchant-country coverage than PaymentIntents.
async function createPaymentIntent({ amount, currency = 'USD', orderId, requestId, returnUrl, customer }) {
    if (isMockPayments()) return { id:`mock-intent-${requestId}`, clientSecret:`mock-secret-${requestId}`, mock:true };
    if (!isConfigured()) throw new Error(`Airwallex ${config().environment} is not fully configured`);
    const token = await getAccessToken();
    const payload = {
        amount: Number(amount), currency: currency.toUpperCase(),
        merchant_order_id: String(orderId), request_id: String(requestId),
        return_url: returnUrl,
        metadata: { payment_order_id:String(orderId) }
    };
    if (customer?.email) payload.customer = {
        email: customer.email, first_name: customer.firstName || undefined, last_name: customer.lastName || undefined
    };
    const res = await fetch(`${config().baseUrl}/api/v1/pa/payment_intents/create`, {
        method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body:JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Airwallex payment-intent create failed: ${await res.text()}`);
    const data = await res.json();
    if (!data.id || !data.client_secret) throw new Error('Airwallex did not return checkout credentials');
    return { id:data.id, clientSecret:data.client_secret, raw:data };
}

async function deactivatePaymentLink(id) {
    if (!id || String(id).startsWith('mock-link-') || isMockPayments()) return { active: false, mock: true };
    if (!isConfigured()) throw new Error(`Airwallex ${config().environment} is not fully configured`);
    const token = await getAccessToken();
    const res = await fetch(`${config().baseUrl}/api/v1/pa/payment_links/${encodeURIComponent(id)}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Airwallex payment-link deactivate failed: ${await res.text()}`);
    return res.json();
}

async function checkPaymentLinkCapability() {
    if (isMockPayments()) return { available: true, mock: true };
    const token = await getAccessToken();
    // Do not infer feature availability from the account country. Vietnamese
    // sandbox accounts are valid; the Payments API itself is the source of
    // truth for whether Payment Links are enabled on this specific account.
    const res = await fetch(`${config().baseUrl}/api/v1/pa/payment_links?page_num=0&page_size=1`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
        const details = await res.text();
        throw new Error(`Airwallex Payment Links unavailable: ${details}`);
    }
    return { available: true };
}

async function getAccountCapability(id) {
    const token = await getAccessToken();
    const res = await fetch(`${config().baseUrl}/api/v1/account_capabilities/${encodeURIComponent(id)}`, {
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Airwallex capability ${id} check failed: ${await res.text()}`);
    return res.json();
}

module.exports = {
    config,
    diagnostics,
    isConfigured,
    getAccessToken,
    checkPaymentLinkCapability,
    getAccountCapability,
    createPaymentLink,
    createPaymentIntent,
    deactivatePaymentLink
};
