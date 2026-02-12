
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- Database Security Diagnosis ---');
    
    // 1. Check current role
    const { data: roleData, error: roleError } = await supabase.rpc('get_role');
    console.log('Current DB Role:', roleData || (roleError ? 'Error: ' + roleError.message : 'Unknown'));

    // 2. Try to list policies (Requires permission, might fail)
    const { data: policies, error: polError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'students');
    
    if (polError) {
        console.log('Could not read pg_policies directly (Expected for non-admin).');
    } else {
        console.log('Active Policies on "students":', policies);
    }

    // 3. Check if RLS is enabled
    // We can infer this from the insert test results. 
    // If it succeeds with NO policies, RLS is either DISABLED or there is an "allow all" policy.
}

diagnose();
