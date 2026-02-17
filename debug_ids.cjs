
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIds() {
    // 1. Check Bisiola's profile
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .or('id.eq.OLISKEY_MAIN_TCH_0001,display_name.ilike.%Bisiola%')
        .maybeSingle();

    console.log('Bisiola Profile:', profile);
    if (pError) console.error('Profile Error:', pError);

    // 2. Check recent notifications and their school_id
    const { data: recent, error: nError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    console.log('Recent Notifications:', recent);
    if (nError) console.error('Notification Error:', nError);

    // 3. Check schools to see if OLISKEY... matches anything
    const { data: schools } = await supabase.from('schools').select('*');
    console.log('All Schools (first 5):', schools?.slice(0, 5));
}

checkIds();
