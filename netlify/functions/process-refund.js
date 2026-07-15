// Airwallex Refund Processing
// Documentation: https://www.airwallex.com/docs/api

const { isAdminRequest } = require('./lib/auth');
const { config: airwallexConfig, getAccessToken } = require('./lib/airwallex');
const { isMockPayments } = require('./lib/payment-environment');

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
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
    if (!isAdminRequest(event)) {
        return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Unauthorized' })
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

        if (isMockPayments()) {
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

        const accessToken = await getAccessToken();

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

        const refundResponse = await fetch(`${airwallexConfig().baseUrl}/api/v1/pa/refunds/create`, {
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
