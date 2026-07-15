// Direct client-created payments were part of the pre-approval flow. Keeping
// this endpoint disabled prevents clients from choosing their own amount or
// creating an Airwallex PaymentIntent without a database reservation.

const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    return {
        statusCode: 410,
        headers: CORS,
        body: JSON.stringify({
            error: 'Direct payment creation has been retired. Register for an event and pay from the approved reservation.'
        })
    };
};
