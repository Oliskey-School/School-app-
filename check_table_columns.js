const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function checkColumns() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase URL or Key missing in .env');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🔍 Fetching table columns...');

    const tables = [
        'behavior_logs'
    ];

    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.error(`❌ Error fetching ${table}:`, error.message);
            } else if (data && data.length > 0) {
                console.log('Columns:', Object.keys(data[0]));
            } else {
                console.log('No data found to determine columns.');
            }
        } catch (e) {
            console.error(`❌ Exception fetching ${table}:`, e.message);
        }
    }
}

checkColumns();
