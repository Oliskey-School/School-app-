import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ikowlorheeyrsbgvlhvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
    console.error('Missing VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log('Logging in as user@school.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'user@school.com',
        password: 'user123'
    });

    if (authError || !authData.user) {
        console.error('Login failed:', authError);
        return;
    }

    console.log('Logged in successfully. User ID:', authData.user.id);

    const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    const branchId = '7601cbea-e1ba-49d6-b59b-412a584cb94f';

    console.log('Testing teachers query identical to frontend...');
    const { data: teachers, error: queryError } = await supabase
        .from('teachers')
        .select('id, name, avatar_url, email, status, school_generated_id')
        .eq('school_id', schoolId)
        .eq('branch_id', branchId)
        .order('name');

    if (queryError) {
        console.error('Query Error:', queryError);
    } else {
        console.log(`Query returned ${teachers?.length || 0} teachers:`);
        console.log(teachers);
    }

    console.log('\nTesting RLS explicitly:');
    const { data: isMainAdmin, error: rpcErr } = await supabase.rpc('is_main_school_admin', { p_school_id: schoolId });
    console.log('is_main_school_admin:', isMainAdmin, 'error:', rpcErr);
}

testConnection();
