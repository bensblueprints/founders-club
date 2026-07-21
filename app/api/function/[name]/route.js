import authLogin from '@/netlify/functions/auth-login';
import authLogout from '@/netlify/functions/auth-logout';
import authMe from '@/netlify/functions/auth-me';
import dbApi from '@/netlify/functions/db-api';
import submitApplication from '@/netlify/functions/submit-application';
import acceptApplication from '@/netlify/functions/accept-application';
import createPayment from '@/netlify/functions/create-payment';
import processRefund from '@/netlify/functions/process-refund';
import airwallexWebhook from '@/netlify/functions/airwallex-webhook';
import sepayWebhook from '@/netlify/functions/sepay-webhook';
import paymentReminders from '@/netlify/functions/payment-reminders';
import registerEvent from '@/netlify/functions/register-event';
import mockPayment from '@/netlify/functions/mock-payment';
import authChangePassword from '@/netlify/functions/auth-change-password';
import authForgotPassword from '@/netlify/functions/auth-forgot-password';
import authResetPassword from '@/netlify/functions/auth-reset-password';
import resendWebhook from '@/netlify/functions/resend-webhook';
import adminApplicationAction from '@/netlify/functions/admin-application-action';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const modules = {
    'auth-login': authLogin,
    'auth-logout': authLogout,
    'auth-me': authMe,
    'db-api': dbApi,
    'submit-application': submitApplication,
    'accept-application': acceptApplication,
    'create-payment': createPayment,
    'process-refund': processRefund,
    'airwallex-webhook': airwallexWebhook,
    'sepay-webhook': sepayWebhook,
    'payment-reminders': paymentReminders,
    'register-event': registerEvent,
    'mock-payment': mockPayment,
    'auth-change-password': authChangePassword,
    'auth-forgot-password': authForgotPassword,
    'auth-reset-password': authResetPassword,
    'resend-webhook': resendWebhook,
    'admin-application-action': adminApplicationAction
};

async function run(request, context) {
    const { name } = await context.params;
    const loaded = modules[name];
    const handler = loaded && (loaded.handler || loaded.default?.handler || loaded.default);
    if (typeof handler !== 'function') {
        return Response.json({ error: 'Unknown function' }, { status: 404 });
    }

    const headers = Object.fromEntries(request.headers.entries());
    const body = ['GET', 'HEAD'].includes(request.method) ? null : await request.text();
    const url = new URL(request.url);
    const event = {
        httpMethod: request.method,
        headers,
        body,
        path: url.pathname,
        rawUrl: request.url,
        queryStringParameters: Object.fromEntries(url.searchParams.entries())
    };

    const result = await handler(event, {});
    const responseHeaders = new Headers(result.headers || {});
    return new Response(result.body || '', {
        status: result.statusCode || 200,
        headers: responseHeaders
    });
}

export const GET = run;
export const POST = run;
export const OPTIONS = run;
