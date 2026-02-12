
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function listTables() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // There is no direct "list tables" in PostgREST, but we can query information_schema if we have an RPC
    // Or we can try to query a known non-existent table and see if the error message lists available tables (sometimes it does in older versions)
    // Actually, best way is to check the migrations or try common names.
    // I'll try to query information_schema.tables if I have permissions.
    const { data, error } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    if (error) {
        console.error('❌ Error listing tables:', error.message);
    } else {
        console.log('Tables:', data.map(t => t.table_name));
    }
}

listTables();
