
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLSBehavior() {
    const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

    console.log('\n--- Simulating Admin View ---');
    // Admin typically has 'authenticated' and maybe specific 'school_id' claim
    // but the JS client mostly uses anon unless we sign in with email/pass.
    // If RLS is ON and NO policy allows SELECT for anon, we get empty array.

    const { data: branches, error } = await supabase
        .from('branches')
        .select('*')
        .eq('school_id', schoolId);

    if (error) {
        console.error('Error fetching branches:', error);
    } else {
        console.log(`Found ${branches.length} branches for school ${schoolId}`);
        branches.forEach(b => console.log(` - ${b.name} (${b.id}) [is_main: ${b.is_main}]`));

        if (branches.length < 2) {
            console.log('\n❌ Only found 1 branch? This suggests RLS is hiding the other one or it is deleted.');
            if (branches.length === 1 && branches[0].is_main) {
                console.log('Only seeing Main Branch. The other branch might be restricted.');
            }
        } else {
            console.log('\n✅ Seeing all branches correctly with current key (service role or anon with open policy).');
        }
    }
}

testRLSBehavior();
