
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealtime() {
    const { data: pubTables, error } = await supabase.rpc('get_table_columns', { table_name: 'pg_publication_tables' }); // I can't use rpc for system tables usually

    // Use raw query if possible, or just try to insert and listen
    console.log('Checking if notifications is in supabase_realtime publication...');

    // Another way: query the rpc I created if it has access
    const { data, error: queryError } = await supabase.from('notifications').select('count', { count: 'exact', head: true });
    console.log('Total notifications:', data, queryError);

    // Let's check profiles for Bisiola
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*').ilike('full_name', '%Bisiola%');
    console.log('Bisiola profiles:', profiles);
}

checkRealtime();
