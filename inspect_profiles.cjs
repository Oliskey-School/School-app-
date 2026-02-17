
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProfiles() {
    // Search by generated ID from screenshot
    const { data: byGenId, error: e1 } = await supabase.from('profiles')
        .select('*')
        .eq('school_generated_id', 'OLISKEY_MAIN_TCH_0001');
    console.log('Search by OLISKEY_MAIN_TCH_0001:', byGenId);

    // Search for any TCH_0001
    const { data: byGId, error: e2 } = await supabase.from('profiles')
        .select('*')
        .ilike('school_generated_id', '%TCH_0001%');
    console.log('Search by %TCH_0001%:', byGId);

    // List first 5 profiles to see structure
    const { data: someProfiles } = await supabase.from('profiles').select('*').limit(5);
    console.log('Sample profiles:', someProfiles);
}

inspectProfiles();
