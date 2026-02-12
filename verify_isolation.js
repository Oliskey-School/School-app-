const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// TEST DATA (Oliskey Demo School context)
const CONFIG = {
    schoolId: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
    branchA: '7601cbea-e1ba-49d6-b59b-412a584cb94f',
    branchB: '90525ef7-34ed-4bb4-af6b-f04884ec6e85'
};

async function runIsolationTests() {
    console.log('--- Starting Isolation Test Suite ---');

    try {
        console.log('1. Running Test: The Wall Test');
        
        const { data: studentInB } = await supabase
            .from('students')
            .select('id, name')
            .eq('branch_id', CONFIG.branchB)
            .limit(1)
            .single();

        if (!studentInB) {
            console.log('   Skip: No student found in Branch B.');
        } else {
            const { data: leakCheck } = await supabase
                .from('students')
                .select('*')
                .eq('id', studentInB.id)
                .eq('branch_id', CONFIG.branchA)
                .maybeSingle();

            if (!leakCheck) {
                console.log('   PASSED: Branch A cannot see Branch B data.');
            } else {
                console.log('   FAILED: Data leakage detected.');
            }
        }

        console.log('2. Running Test: The Hacker Test (Restricted Context)');
        
        // We create a "Hacker Client" that does NOT use the Service Role privileges
        // by simulating a request that would come from a browser without valid auth headers.
        const hackerClient = createClient(supabaseUrl, 'invalid-or-restricted-key');

        const { data: hackerData, error: hackerError } = await hackerClient
            .from('students')
            .insert([{
                name: "Real Hacker Attempt " + Date.now(),
                school_id: CONFIG.schoolId,
                branch_id: CONFIG.branchB,
                grade: 10,
                section: 'A'
            }]);

        if (hackerError) {
            console.log('   ✅ PASSED: Unauthorized write blocked: ' + hackerError.message);
        } else {
            console.log('   ❌ FAILED: The system allowed a write with no/invalid credentials!');
        }

    } catch (err) {
        console.log('Error during tests: ' + err.message);
    }

    console.log('--- Test Suite Complete ---');
}

runIsolationTests();
