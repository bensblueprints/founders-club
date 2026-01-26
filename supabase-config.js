// ========================================
// FOUNDERS VIETNAM - Supabase Configuration
// ========================================
// 
// INSTRUCTIONS:
// 1. Go to your Supabase project dashboard
// 2. Click on Settings > API
// 3. Copy the "Project URL" and "anon public" key
// 4. Paste them below
// ========================================

const SUPABASE_URL = 'https://afnikqescveajfempelv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbmlrcWVzY3ZlYWpmZW1wZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzAzNTAsImV4cCI6MjA4NTAwNjM1MH0.L-0DoA-gWpMHkW7BqQXtMxtjO3jG-Lp3bXKfVqywg3I';

// Initialize Supabase client
// Using the CDN version for browser compatibility
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Check if configured
const isSupabaseConfigured = () => {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
};

// Export for use in other files
window.SupabaseConfig = {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
    client: supabaseClient,
    isConfigured: isSupabaseConfigured
};
