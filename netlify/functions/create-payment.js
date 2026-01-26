// Airwallex Payment Intent Creation
// Documentation: https://www.airwallex.com/docs/api

const AIRWALLEX_API_KEY = process.env.AIRWALLEX_API_KEY;
const AIRWALLEX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID;
const AIRWALLEX_BASE_URL = process.env.AIRWALLEX_ENV === 'production'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';

exports.handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { amount, currency, description, customerEmail, customerName, eventId, ticketType } = JSON.parse(event.body);

        // Validate required fields
        if (!amount || !currency || !customerEmail) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields: amount, currency, customerEmail' })
            };
        }

        // Step 1: Get access token
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
            console.error('Auth error:', authError);
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Authentication failed' })
            };
        }

        const authData = await authResponse.json();
        const accessToken = authData.token;

        // Step 2: Create payment intent
        const paymentIntent = {
            amount: parseFloat(amount),
            currency: currency.toUpperCase(),
            merchant_order_id: `FV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            descriptor: description || 'Founders Vietnam',
            metadata: {
                customer_email: customerEmail,
                customer_name: customerName,
                event_id: eventId,
                ticket_type: ticketType
            },
            request_id: `req-${Date.now()}`,
            return_url: `${process.env.URL || 'https://foundersvietnam.com'}/payment-success.html`
        };

        const paymentResponse = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/pa/payment_intents/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(paymentIntent)
        });

        if (!paymentResponse.ok) {
            const paymentError = await paymentResponse.text();
            console.error('Payment intent error:', paymentError);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Failed to create payment intent' })
            };
        }

        const paymentData = await paymentResponse.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                paymentIntentId: paymentData.id,
                clientSecret: paymentData.client_secret,
                amount: paymentData.amount,
                currency: paymentData.currency
            })
        };

    } catch (error) {
        console.error('Payment error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
