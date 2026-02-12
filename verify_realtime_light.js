const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Testing with restriction (mimics browser)
const supabase = createClient(supabaseUrl, supabaseKey);

const SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
const BRANCH_ID = '7601cbea-e1ba-49d6-b59b-412a584cb94f'; // Main Branch

async function verifyVisibility() {
    console.log('--- Verifying Data Visibility (Restricted Client) ---');

    try {
        // 1. Can I see branches?
        const { data: branches, error: bErr } = await supabase
            .from('branches')
            .select('name, id')
            .eq('school_id', SCHOOL_ID);
        
        if (bErr) {
            console.error('❌ Cannot see branches:', bErr.message);
        } else {
            console.log(`✅ Visible branches: ${branches.length}`);
        }

        // 2. Can I see students in that branch?
        const { data: students, error: sErr } = await supabase
            .from('students')
            .select('name')
            .eq('school_id', SCHOOL_ID)
            .eq('branch_id', BRANCH_ID)
            .limit(1);

        if (sErr) {
            console.error('❌ Cannot see students:', sErr.message);
        } else if (!students || students.length === 0) {
            console.log('❌ RLS BLOCKED: No students returned (Empty list).');
        } else {
            console.log('✅ SUCCESS: Visible students found.');
        }

    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verifyVisibility();
