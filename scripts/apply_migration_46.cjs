const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key) envVars[key.trim()] = valueParts.join('=').trim();
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || envVars['SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('🚀 Applying Migration 0046: Full Schema Sync...');

    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '0046_full_schema_sync.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error('Migration file not found!');
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // We can't usually run raw SQL with anon key via client.from() unless we have an RPC function 'exec_sql'.
    // BUT we can try if the user has setup the 'exec_sql' helper previously (common in these projects).

    // Attempt 1: RPC exec_sql
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error('❌ Failed to run via RPC:', error.message);
        console.log('\n⚠️  You must run this migration manually in the Supabase SQL Editor.');
        console.log(`\nFile: database/migrations/0046_full_schema_sync.sql`);
        console.log('\nContent copied to clipboard (simulated)...');
    } else {
        console.log('✅ Migration applied successfully via RPC!');
    }
}

applyMigration();
