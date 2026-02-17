
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log('--- Checking RLS Status ---');
    try {
        console.log('Testing RLS Read with anonymous user...');
        const { data, error: readError } = await supabase
            .from('students')
            .select('id')
            .limit(1);

        if (readError) {
            console.log('✅ RLS active on SELECT (Read blocked/error): ' + readError.message);
        } else {
            console.log('⚠️ RLS inactive or permissive on SELECT (Read succeeded). Rows found: ' + data.length);
        }

        // Try a more direct test: Insert with a completely invalid school_id
        console.log('Testing RLS Write with invalid school_id...');
        const { error } = await supabase
            .from('students')
            .insert([{
                name: "RLS Check",
                school_id: '00000000-0000-0000-0000-000000000000',
                branch_id: '00000000-0000-0000-0000-000000000000',
                grade: 1,
                section: 'Z'
            }]);

        if (error) {
            console.log('✅ RLS active (Insert blocked/error): ' + error.message);
        } else {
            console.log('❌ RLS inactive or too permissive (Insert succeeded with dummy ID).');
            // Clean up
            await supabase.from('students').delete().eq('name', 'RLS Check');
        }

    } catch (err) {
        console.log('Error checking RLS: ' + err.message);
    }
}

checkRLS();
