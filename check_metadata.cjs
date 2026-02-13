
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMetadata() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) { console.error(error); return; }

    const admin = users.find(u => u.email === 'admin@demo.com');
    if (admin) {
        console.log('\n--- Admin Metadata Report ---');
        console.log('Email:', admin.email);
        console.log('User Metadata:', admin.user_metadata);
        console.log('App Metadata:', admin.app_metadata);

        const assigned = admin.user_metadata.branch_id || admin.app_metadata.branch_id;
        const active = admin.user_metadata.active_branch_id || admin.app_metadata.active_branch_id;

        console.log('\n--- Diagnosis ---');
        console.log(`Assigned Branch (Hard lock): ${assigned || 'NULL (Unrestricted)'}`);
        console.log(`Active Branch (Current view): ${active || 'NULL (All/Default)'}`);

        if (!assigned && active) {
            console.log('🚨 TRAP DETECTED: User is unrestricted but has an Active Branch set.');
            console.log('The current logic likely treats "active_branch_id" as a lock, preventing switching.');
        } else {
            console.log('User state looks clean.');
        }
    }
}

checkMetadata();
