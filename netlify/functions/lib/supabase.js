// Shared server-side Supabase client using the SERVICE ROLE key.
// Server writes MUST use the service role key — the anon key is blocked by RLS for inserts/updates.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://afnikqescveajfempelv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceClient() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        return null; // caller decides how to degrade
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

function isConfigured() {
    return Boolean(SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = { getServiceClient, isConfigured, SUPABASE_URL };
