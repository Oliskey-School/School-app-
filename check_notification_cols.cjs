
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data: columns, error } = await supabase.rpc('get_table_columns', { table_name: 'notifications' });

    if (error) {
        // Fallback if RPC doesn't exist: use a raw select query on a non-existent column to see the error message which lists columns
        // Or just fetch 1 row and inspect keys (which I already did, but let's be thorough)
        const { data, error: fetchError } = await supabase.from('notifications').select('*').limit(1);
        if (data && data.length > 0) {
            console.log('Columns found via fetch:', Object.keys(data[0]));
        } else {
            console.log('Table is empty or fetch failed.');
        }
    } else {
        console.log('Columns found via RPC:', columns);
    }
}

checkColumns();
