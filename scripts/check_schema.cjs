const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual Env Parsing
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envFile.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim().replace(/"/g, ''); // Remove quotes
            }
        });
        return envVars;
    } catch (error) {
        console.warn('Could not read .env file, checking process.env');
        return process.env;
    }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking Schema Types...');

    const tables = ['timetable', 'students', 'parents'];

    // We can't access information_schema directly easily with supabase-js simple client (unless RPC),
    // but we can try to select one row and infer types, OR assume we can't get metadata.
    // Actually, asking the user to run SQL is safer, but I want to automate.
    // I previously ran migration scripts via "Run this SQL".
    // I can try to use a "bad query" to trigger a type error that tells me the type? 
    // No, standard `select` returns JS types (number, string).
    // If I select `user_id` from `students`, and it comes back as a number, I know it's integer.
    // If it comes back as a UUID string, it's string.

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
            continue;
        }
        if (data && data.length > 0) {
            const row = data[0];
            console.log(`\nTable: ${table}`);
            console.log('Columns:', Object.keys(row));
            if (table === 'timetable') {
                 console.log('Sample Row:', JSON.stringify(row, null, 2));
            }
        } else {
            console.log(`\nTable: ${table} is empty, cannot infer types.`);
        }
    }
}

checkSchema();
