const ALLOWED_ENVIRONMENTS = new Set(['mock', 'sandbox', 'production']);

function paymentEnvironment() {
    const value = String(process.env.PAYMENTS_ENV || (process.env.NODE_ENV === 'test' ? 'mock' : 'sandbox')).toLowerCase();
    if (!ALLOWED_ENVIRONMENTS.has(value)) {
        throw new Error('PAYMENTS_ENV must be mock, sandbox, or production');
    }
    return value;
}

function isMockPayments() {
    return paymentEnvironment() === 'mock';
}

function isProductionPayments() {
    return paymentEnvironment() === 'production';
}

function enabledPaymentProviders() {
    const configured = String(process.env.PAYMENT_PROVIDERS || 'airwallex,sepay')
        .split(',')
        .map(value => value.trim().toLowerCase())
        .filter(Boolean);
    const providers = new Set(configured);
    for (const provider of providers) {
        if (!['airwallex', 'sepay'].includes(provider)) {
            throw new Error(`Unsupported payment provider: ${provider}`);
        }
    }
    if (providers.size === 0) throw new Error('PAYMENT_PROVIDERS must enable at least one provider');
    return providers;
}

function paymentProviderEnabled(provider) {
    return enabledPaymentProviders().has(String(provider).toLowerCase());
}

module.exports = {
    paymentEnvironment,
    isMockPayments,
    isProductionPayments,
    enabledPaymentProviders,
    paymentProviderEnabled
};
