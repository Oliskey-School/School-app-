const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function test() {
    const { data: schools } = await supabase.from('schools').select('id, name');

    for (const school of (schools || [])) {
        let { count: students } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', school.id);
        if (students > 0) {
            console.log(`School: ${school.name} (ID: ${school.id}) has ${students} students.`);
        }
    }
}

test().catch(console.error);
