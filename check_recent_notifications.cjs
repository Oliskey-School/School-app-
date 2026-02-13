
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Use Service Key to bypass RLS for this check to see if it exists at all
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentNotifications() {
    console.log('\n--- Checking Recent Notifications (Last 10 mins) ---');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .gt('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
    } else {
        console.table(data.map(n => ({
            ID: n.id,
            Title: n.title,
            UserID: n.user_id, // Should be NULL for broadcast
            Audience: JSON.stringify(n.audience),
            School: n.school_id
        })));

        if (data.length === 0) {
            console.log('No recent notifications found. The INSERT likely failed or was blocked.');
        } else {
            console.log('✅ Notifications exist in DB. If users don\'t see them, it\'s likely an RLS issue.');
        }
    }
}

checkRecentNotifications();
