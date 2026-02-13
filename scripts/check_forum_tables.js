
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking forum_topics table...');
    const { data, error } = await supabase.from('forum_topics').select('*').limit(1);

    if (error) {
        console.error('Error fetching forum_topics:', error.message);
        if (error.code === '42P01') {
            console.log('Table forum_topics does NOT exist.');
        }
    } else {
        console.log('Table forum_topics exists.');
    }

    console.log('Checking forum_posts table...');
    const { data: posts, error: postsError } = await supabase.from('forum_posts').select('*').limit(1);
    if (postsError) {
        console.error('Error fetching forum_posts:', postsError.message);
        if (postsError.code === '42P01') {
            console.log('Table forum_posts does NOT exist.');
        }
    } else {
        console.log('Table forum_posts exists.');
    }
}

checkTables();
