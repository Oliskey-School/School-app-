
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    const { data: policies, error } = await supabase.rpc('pg_get_policies');
    // If RPC doesn't exist, we can try querying pg_catalog directly (might fail if not authorized via RPC)

    // Try raw query if possible (likely won't work from client)
    const { data: rawPolicies, error: rawError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'notifications');

    if (rawError) {
        console.log('Direct query to pg_policies failed (expected). Trying another way...');
    } else {
        console.log('Policies for notifications:', rawPolicies);
    }

    // Try to select with ANON key to see what's visible
    const anonSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
    const { data: anonData, error: anonError } = await anonSupabase.from('notifications').select('*').limit(1);
    console.log('Fetch with ANON key:', { count: anonData?.length, error: anonError });
}

checkRLS();
