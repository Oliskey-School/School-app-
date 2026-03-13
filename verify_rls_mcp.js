
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SCHOOL_A = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
const SCHOOL_B = '00000000-0000-0000-0000-000000000000';

async function testRLS() {
    console.log('--- Phase 2: RLS Verification ---');

    // Test 1: Count students without any session (should be 0 or restricted if RLS is on)
    const { data: anonData, error: anonError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
    
    console.log(`Anon access student count: ${anonData?.length || 0}`);
    if (anonError) console.log(`Anon Error: ${anonError.message}`);

    // Since we can't easily forge JWTs here without service role (which bypasses RLS), 
    // we will check the RLS policy definitions directly via SQL to verify 'app_metadata' usage.
    
    console.log('\n--- Verifying RLS Policy Definitions ---');
}

testRLS();
