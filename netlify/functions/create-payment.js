// Airwallex Payment Intent Creation
// Documentation: https://www.airwallex.com/docs/api

const AIRWALLEX_API_KEY = process.env.AIRWALLEX_API_KEY;
const AIRWALLEX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID;
const AIRWALLEX_BASE_URL = process.env.AIRWALLEX_ENV === 'production'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';

// Product catalog - prices validated server-side for security
const PRODUCTS = {
    // Memberships
    'founding-member': { price: 250, currency: 'USD', name: 'Founding Member', type: 'membership' },
    'platinum-founding': { price: 500, currency: 'USD', name: 'Platinum Founding Member', type: 'membership' },
    // Event Tickets
    'platinum-cruise': { price: 349, currency: 'USD', name: 'Poseidon Cruise', type: 'event' },
    'founding-dinner': { price: 149, currency: 'USD', name: 'Founders Dinner', type: 'event' },
    // Upsells
    'plus-one-cruise': { price: 250, currency: 'USD', name: 'Plus One - Cruise', type: 'upsell' },
    'plus-one-dinner': { price: 75, currency: 'USD', name: 'Plus One - Dinner', type: 'upsell' },
    'vip-upgrade': { price: 100, currency: 'USD', name: 'VIP Table Upgrade', type: 'upsell' },
    'annual-membership-upgrade': { price: 2400, currency: 'USD', name: 'Annual Membership', type: 'upsell' }
};

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
            productIds,           // Array of product IDs to purchase
            customerEmail,
            customerName,
            eventId,
            memberId,
            // Legacy support
            amount: legacyAmount,
            currency: legacyCurrency,
            description: legacyDescription,
            ticketType: legacyTicketType
        } = body;

        // Calculate total from product IDs (server-side validation)
        let totalAmount = 0;
        let currency = 'USD';
        let itemDescriptions = [];
        let productDetails = [];

        if (productIds && productIds.length > 0) {
            for (const productId of productIds) {
                const product = PRODUCTS[productId];
                if (!product) {
                    return {
                        statusCode: 400,
                        headers: { 'Access-Control-Allow-Origin': '*' },
                        body: JSON.stringify({ error: `Invalid product: ${productId}` })
                    };
                }
                totalAmount += product.price;
                currency = product.currency;
                itemDescriptions.push(product.name);
                productDetails.push({ id: productId, ...product });
            }
        } else if (legacyAmount) {
            // Legacy support for direct amount
            totalAmount = parseFloat(legacyAmount);
            currency = legacyCurrency || 'USD';
            itemDescriptions.push(legacyDescription || 'Founders Vietnam Purchase');
        }

        if (totalAmount <= 0) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Invalid amount' })
            };
        }

        if (!customerEmail) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Customer email required' })
            };
        }

        // Check if Airwallex is configured
        if (!AIRWALLEX_API_KEY || !AIRWALLEX_CLIENT_ID) {
            console.log('Airwallex not configured, returning mock response');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    paymentIntentId: `mock-${Date.now()}`,
                    clientSecret: `mock-secret-${Date.now()}`,
                    amount: totalAmount,
                    currency: currency,
                    products: productDetails,
                    mock: true
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

        // Step 2: Create payment intent
        const orderId = `FV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const paymentIntent = {
            amount: totalAmount,
            currency: currency.toUpperCase(),
            merchant_order_id: orderId,
            descriptor: 'Founders Vietnam',
            order: {
                products: productDetails.map(p => ({
                    name: p.name,
                    quantity: 1,
                    unit_price: p.price,
                    sku: p.id
                }))
            },
            metadata: {
                customer_email: customerEmail,
                customer_name: customerName || '',
                event_id: eventId || '',
                member_id: memberId || '',
                product_ids: productIds ? productIds.join(',') : '',
                items: itemDescriptions.join(', ')
            },
            request_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            return_url: `${process.env.URL || 'https://foundersvietnam.com'}/payment-success.html?order=${orderId}`
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
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Failed to create payment', details: paymentError })
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
                currency: paymentData.currency,
                orderId: orderId,
                products: productDetails
            })
        };

    } catch (error) {
        console.error('Payment error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Internal server error', message: error.message })
        };
    }
};
