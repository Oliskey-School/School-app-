const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySecurity() {
    console.log('--- STARTING SECURITY AUDIT ---');
    const tables = [
        'schools', 'branches', 'students', 'teachers', 'profiles', 
        'classes', 'parents', 'payments', 'student_fees', 
        'student_attendance', 'notices', 'transport_buses', 'quizzes'
    ];

    console.log('\n1. Testing Anonymous Access (Should be blocked by RLS)...');
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`✅ [${table}] Read blocked: ${error.message}`);
            } else if (data && data.length > 0) {
                console.log(`⚠️ [${table}] WARNING: Anonymous user can see data!`);
            } else {
                console.log(`✅ [${table}] Read returned 0 rows (RLS filtered).`);
            }
        } catch (err) {
            console.log(`❌ [${table}] Error: ${err.message}`);
        }
    }

    console.log('\n--- AUDIT COMPLETE ---');
}

verifySecurity();
