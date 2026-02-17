
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Use ANON key to simulate client-side access
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVisibility() {
    const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    console.log('\n--- Simulating Client-Side Fetch (Unauth/Anon) ---');

    // Attempt to fetch notifications where user_id is null (broadcast)
    // If RLS is strictly "user_id = auth.uid()", this will return 0 rows
    // because auth.uid() is null (anon) but likely prompts authentication
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('school_id', schoolId)
        .is('user_id', null);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Found ${data.length} broadcast notifications visible to anon/public.`);
        if (data.length === 0) {
            console.log('❌ Broadcast notifications remain hidden. RLS is likely blocking access.');
        } else {
            console.log('✅ Visible! (This is unusual unless policy is very open)');
        }
    }
}

checkVisibility();
