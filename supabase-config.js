// Supabase Configuration
const SUPABASE_URL = 'https://afnikqescveajfempelv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbmlrcWVzY3ZlYWpmZW1wZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzAzNTAsImV4cCI6MjA4NTAwNjM1MH0.L-0DoA-gWpMHkW7BqQXtMxtjO3jG-Lp3bXKfVqywg3I';

// Initialize Supabase client (loaded via CDN in HTML)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other scripts
window.supabaseClient = supabase;
