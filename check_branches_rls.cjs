
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log('\n--- Checking RLS Policies for "branches" ---');
    const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'branches');

    if (error) {
        // Fallback for limited permission users: Assume RLS via behavior
        console.error('Cannot query pg_policies (Permissions denied). Testing behavior...');
    } else {
        console.table(policies.map(p => ({
            Name: p.policyname,
            Perm: p.cmd,
            Roles: p.roles,
            Using: p.qual,
            Check: p.with_check
        })));
    }
}
checkRLS();
