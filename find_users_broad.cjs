const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    console.log("1. Inspecting 'parents' table schema (first row)...");
    const { data: pSchema, error: pErr } = await supabase.from('parents').select('*').limit(1);
    if (pErr) console.error("Error:", pErr);
    else if (pSchema.length > 0) console.log("Columns:", Object.keys(pSchema[0]));
    else console.log("Parents table is empty.");

    console.log("\n2. Finding 'Demo' or 'Alat' users in profiles...");
    const { data: users, error: uErr } = await supabase
        .from('profiles')
        .select('*')
        .or('full_name.ilike.%Demo%,full_name.ilike.%Alat%,email.ilike.%demo%,email.ilike.%alat%');

    if (uErr) console.error("Error:", uErr);
    else {
        console.log(`Found ${users.length} matching profiles:`);
        users.forEach(u => console.log(JSON.stringify(u, null, 2)));
    }
}

run();
