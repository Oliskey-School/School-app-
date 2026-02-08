const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

// Check if we are using service role (preferred for admin tasks) or anon
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Using Service Role Key for verification.");
} else {
    console.log("Using Anon Key. RPC might fail if not authenticated.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("Verifying Dashboard RPC...");

    // 1. Get a valid school ID from the schools table
    const { data: schools, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .limit(1);

    if (schoolError || !schools || schools.length === 0) {
        console.error("❌ Could not fetch any school:", schoolError ? schoolError.message : 'No schools found');
        // Try to continue without school ID if possible? No.
        return;
    }

    const schoolId = schools[0].id;
    console.log(`Testing with School: ${schools[0].name} (${schoolId})`);

    // 2. Call RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats', {
        p_school_id: schoolId
    });

    if (rpcError) {
        console.error("❌ RPC Call Failed:", rpcError.message);
    } else {
        console.log("✅ RPC Result:", JSON.stringify(rpcData, null, 2));
    }

    // 3. Verify Tables directly
    console.log("\nVerifying Table Counts (Direct Query)...");
    const tables = ['students', 'teachers', 'parents', 'student_fees'];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);

        if (error) console.error(`   ${table}: Error - ${error.message}`);
        else console.log(`   ${table}: ${count} rows`);
    }
}

verify();
