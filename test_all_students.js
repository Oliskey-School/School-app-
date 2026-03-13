const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function test() {
    let { count: students } = await supabase.from('students').select('*', { count: 'exact', head: true });
    let { count: profiles } = await supabase.from('users').select('*', { count: 'exact', head: true });
    let { data: usersData } = await supabase.from('users').select('school_id').limit(5);

    console.log(`Total students: ${students}`);
    console.log(`Total profiles: ${profiles}`);
    console.log('Sample profiles:', usersData);
}

test().catch(console.error);
