// Shared Airwallex helper — auth + payment-link creation.
// Mirrors the auth/create pattern in create-payment.js so all functions share one code path.

const AIRWALLEX_API_KEY = process.env.AIRWALLEX_API_KEY;
const AIRWALLEX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID;
const AIRWALLEX_BASE_URL = process.env.AIRWALLEX_ENV === 'production'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';

function isConfigured() {
    return Boolean(AIRWALLEX_API_KEY && AIRWALLEX_CLIENT_ID);
}

// Log in and return a bearer access token (same endpoint create-payment.js uses).
async function getAccessToken() {
    const res = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/authentication/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': AIRWALLEX_API_KEY,
            'x-client-id': AIRWALLEX_CLIENT_ID
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
// Returns { id, url }. When Airwallex is not configured, returns a mock link so the rest of
// the accept flow (DB write + email) can still be exercised end-to-end.
async function createPaymentLink({ amount, currency = 'USD', title, description, reference, metadata = {}, expiresAt }) {
    if (!isConfigured()) {
        const mockId = `mock-link-${Date.now()}`;
        return {
            id: mockId,
            url: `${process.env.URL || 'https://foundersvn.com'}/payment-success.html?mock=1&order=${mockId}`,
            mock: true
        };
    }

    const token = await getAccessToken();

    const payload = {
        amount,
        currency: currency.toUpperCase(),
        title: title || 'FoundersVN',
        description: description || '',
        reusable: false,
        request_id: `plink-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        metadata
    };
    if (reference) payload.reference = reference;
    if (expiresAt) payload.expires_at = expiresAt; // ISO string

    const res = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/pa/payment_links/create`, {
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

module.exports = {
    AIRWALLEX_BASE_URL,
    isConfigured,
    getAccessToken,
    createPaymentLink
};
