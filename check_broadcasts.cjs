
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBroadcasts() {
    // Check null user_id notifications
    const { data: broadcasts, error } = await supabase.from('notifications')
        .select('*')
        .is('user_id', null);
    console.log('Broadcast notifications (user_id IS NULL):', broadcasts);

    // Check if Bisiola or Demo Admin are in auth.users
    // (I can't query auth.users directly without service key and maybe even then it depends on Supabase version)
    // But I can check profiles for anyone with "Admin"
    const { data: adminProfiles } = await supabase.from('profiles').select('*').ilike('full_name', '%Admin%');
    console.log('Admin profiles:', adminProfiles);

    // Check all notifications for the demo school
    const { data: allNotif } = await supabase.from('notifications')
        .select('*')
        .eq('school_id', 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');
    console.log('All notifications for Demo School:', allNotif);
}

checkBroadcasts();
