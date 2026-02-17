
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPolicies() {
    const { data: policies, error } = await supabase.rpc('pg_get_policies');

    // Fallback: Use direct SQL via execute_sql if RPC fails or returns nothing
    const { data, error: sqlError } = await supabase.from('pg_policies').select('*').eq('tablename', 'notifications');
    // Note: Querying pg_policies usually requires elevated permissions, which the service key might have 
    // depending on the Supabase configuration.

    console.log('Polices from pg_policies:', data);
    if (sqlError) console.error('SQL Error:', sqlError);
}

inspectPolicies();
