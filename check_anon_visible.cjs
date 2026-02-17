
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) process.exit(1);

const supabase = createClient(supabaseUrl, anonKey);

async function checkVisibleRecord() {
    const { data, error } = await supabase.from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    console.log('Latest visible records for ANON/Authenticated:', data);
    if (error) console.error('Error:', error);
}

checkVisibleRecord();
