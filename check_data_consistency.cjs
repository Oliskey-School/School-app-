
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDataConsistency() {
    console.log('\n--- Checking Schools ---');
    const { data: schools } = await supabase.from('schools').select('id, name');
    console.table(schools);

    console.log('\n--- Checking Notifications across all schools ---');
    const { data: notifications } = await supabase
        .from('notifications')
        .select('id, school_id, user_id, audience, title, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    console.table(notifications.map(n => ({
        ...n,
        audience: JSON.stringify(n.audience)
    })));

    console.log('\n--- Checking Admin Profile ---');
    const { data: admins } = await supabase
        .from('profiles')
        .select('id, email, role, school_id')
        .eq('role', 'admin')
        .limit(5);
    console.table(admins);
}

checkDataConsistency();
