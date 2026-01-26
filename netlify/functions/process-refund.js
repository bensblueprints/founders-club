// Airwallex Refund Processing
// Documentation: https://www.airwallex.com/docs/api

const AIRWALLEX_API_KEY = process.env.AIRWALLEX_API_KEY;
const AIRWALLEX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID;
const AIRWALLEX_BASE_URL = process.env.AIRWALLEX_ENV === 'production'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const {
            paymentIntentId,
            amount,
            reason,
            applicationId,
            customerEmail,
            customerName
        } = body;

        if (!paymentIntentId) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Payment intent ID required' })
            };
        }

        // Check if Airwallex is configured
        if (!AIRWALLEX_API_KEY || !AIRWALLEX_CLIENT_ID) {
            console.log('Airwallex not configured, returning mock refund response');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    refundId: `mock-refund-${Date.now()}`,
                    paymentIntentId: paymentIntentId,
                    amount: amount,
                    status: 'SUCCEEDED',
                    mock: true,
                    message: 'Refund processed (mock mode - Airwallex not configured)'
                })
            };
        }

        // Step 1: Get access token from Airwallex
        const authResponse = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/authentication/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': AIRWALLEX_API_KEY,
                'x-client-id': AIRWALLEX_CLIENT_ID
            }
        });

        if (!authResponse.ok) {
            const authError = await authResponse.text();
            console.error('Airwallex auth error:', authError);
            return {
                statusCode: 401,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Payment authentication failed', details: authError })
            };
        }

        const authData = await authResponse.json();
        const accessToken = authData.token;

        // Step 2: Create refund
        const refundRequest = {
            payment_intent_id: paymentIntentId,
            reason: reason || 'Application rejected - full refund per policy',
            metadata: {
                application_id: applicationId || '',
                customer_email: customerEmail || '',
                customer_name: customerName || '',
                refund_type: 'application_rejection'
            },
            request_id: `refund-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
        };

        // If specific amount provided, include it (otherwise full refund)
        if (amount) {
            refundRequest.amount = parseFloat(amount);
        }

        const refundResponse = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/pa/refunds/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(refundRequest)
        });

        if (!refundResponse.ok) {
            const refundError = await refundResponse.text();
            console.error('Refund error:', refundError);
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Failed to process refund', details: refundError })
            };
        }

        const refundData = await refundResponse.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                refundId: refundData.id,
                paymentIntentId: paymentIntentId,
                amount: refundData.amount,
                currency: refundData.currency,
                status: refundData.status,
                message: 'Refund processed successfully'
            })
        };

    } catch (error) {
        console.error('Refund error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Internal server error', message: error.message })
        };
    }
};
