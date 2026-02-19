
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase URL or Anon Key in .env');
  process.exit(1);
}

console.log(`Checking connection to ${supabaseUrl}...`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Try to fetch a public table (e.g. schools or just a health check)
    // We'll try to select count from 'schools' which usually exists.
    // If table doesn't exist, we'll catch the error.
    const { count, error } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Connection failed or table "schools" not accessible:', error.message);
      if (error.code) console.error('Error Code:', error.code);
      // Try a simpler check - maybe just auth.getSession
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError) {
         console.error('❌ Auth service also unreachable:', authError.message);
      } else {
         console.log('✅ Auth service is reachable.');
      }
    } else {
      console.log('✅ Connection successful! Found', count, 'schools.');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

testConnection();
