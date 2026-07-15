#!/usr/bin/env node

const {
    paymentEnvironment,
    isMockPayments,
    enabledPaymentProviders
} = require('../netlify/functions/lib/payment-environment');
const airwallex = require('../netlify/functions/lib/airwallex');
const sepay = require('../netlify/functions/lib/sepay');

(async () => {
    const environment = paymentEnvironment();
    const providers = enabledPaymentProviders();
    const airwallexConfig = airwallex.config();
    const sepayConfig = sepay.config();

    console.log(`Payment environment: ${environment}`);
    console.log(`Enabled providers: ${[...providers].join(', ')}`);
    if (isMockPayments()) {
        console.log('Mock settlement is enabled. Use only for automated tests.');
        return;
    }

    if (providers.has('airwallex')) {
        if (!airwallex.isConfigured()) {
            throw new Error(`Airwallex ${environment} credentials or webhook secret are missing`);
        }
        await airwallex.getAccessToken();
        console.log(`Airwallex authentication: OK (${airwallexConfig.baseUrl})`);
        const capabilities = await Promise.all(['payments_visa', 'payments_mastercard'].map(id => airwallex.getAccountCapability(id)));
        for (const capability of capabilities) console.log(`Airwallex ${capability.id}: ${capability.status}`);
        if (!capabilities.some(capability => capability.status === 'ENABLED')) {
            throw new Error('Airwallex Online Payments is not enabled yet (Visa/Mastercard capability is pending or disabled)');
        }
        console.log('Airwallex Hosted Payment Page: ready');
    }
    if (providers.has('sepay')) {
        if (!sepay.isConfigured()) {
            throw new Error(`SePay ${environment} bank details or webhook secret are missing`);
        }
        console.log(`SePay configuration: OK (${sepayConfig.bank}, account ending ${sepayConfig.account.slice(-4)})`);
    }
    console.log('Provider configuration is ready. No payment was created.');
})().catch(error => {
    console.error(`Payment configuration check failed: ${error.message}`);
    process.exit(1);
});
