
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotices() {
    const { data: notices, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(5);
    console.log('Recent Notices:', notices);

    // Also check the specific notification records again with more detail
    const { data: notifs } = await supabase.from('notifications')
        .select('*')
        .eq('title', 'New Announcement: ljbcoebqls');
    console.log('Specific Notification:', notifs);
}

checkNotices();
