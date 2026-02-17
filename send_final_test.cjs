
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendFinalTest() {
    const timestamp = new Date().toLocaleTimeString();
    const { data, error } = await supabase.from('notifications').insert({
        school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
        title: `Final Verification Test [${timestamp}]`,
        message: 'This message should now be visible to everyone in the demo school.',
        user_id: null,
        audience: ['all'],
        category: 'Alert'
    }).select();

    if (error) {
        console.error('Error sending test:', error);
    } else {
        console.log('Test announcement sent successfully:', data);
    }
}

sendFinalTest();
