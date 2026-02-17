const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns(table) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
        console.log(`Error checking ${table}: ${error.message}`);
        // Try probing via insert if table is empty
        const { error: insErr } = await supabase.from(table).insert([{}]);
        console.log(`  Probing ${table} via insert error: ${insErr?.message}`);
    } else if (data.length > 0) {
        console.log(`✅ Columns in ${table}:`, Object.keys(data[0]));
    } else {
        console.log(`⚠️ Table ${table} is empty. Probing...`);
        const { error: insErr } = await supabase.from(table).insert([{}]);
        console.log(`  Probing ${table} via insert error: ${insErr?.message}`);
    }
}

async function run() {
    const tables = ['schools', 'branches', 'users', 'teachers', 'students', 'parents'];
    for (const table of tables) {
        await checkColumns(table);
    }
}

run();
