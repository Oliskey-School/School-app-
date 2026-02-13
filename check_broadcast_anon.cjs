
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) process.exit(1);

const supabase = createClient(supabaseUrl, anonKey);

async function checkSpecificRecord() {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', 'aa6f3296-e9ca-4380-931a-2076efa66c1a');

    console.log('Specific record search (ANON):', data);
    if (error) console.error('Error:', error);

    // Also check the most recent broadcast
    const { data: recent } = await supabase
        .from('notifications')
        .select('*')
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .limit(1);
    console.log('Most recent broadcast (ANON):', recent);
}

checkSpecificRecord();
