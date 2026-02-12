
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try { require('dotenv').config(); } catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function findOrphanedAuthUser() {
    console.log('--- Finding Orphaned Auth User ---');

    // We need to list users and filter by metadata in JS because Supabase Auth API doesn't support filtering by metadata directly in listUsers easily without getting all.
    // Or we can search by email if we can guess it.

    // Let's try searching for "parent" emails first to narrow it down.

    const { data: { users }, error } = await supabase.auth.admin.listUsers({
        perPage: 1000
    });

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    console.log(`Scanned ${users.length} auth users.`);

    const targetId = 'OLISKEY_MAIN_PAR_0001';

    const foundUser = users.find(u => {
        const meta = u.user_metadata || {};
        const appMeta = u.app_metadata || {};
        return meta.school_generated_id === targetId || appMeta.school_generated_id === targetId;
    });

    if (foundUser) {
        console.log('\n✅ FOUND ORPHANED USER:');
        console.log(` - ID: ${foundUser.id}`);
        console.log(` - Email: ${foundUser.email}`);
        console.log(` - Role: ${foundUser.user_metadata.role || 'N/A'}`);
        console.log(` - Metadata:`, foundUser.user_metadata);

        // Check if DB record exists checking BOTH user_id and school_generated_id
        const { data: dbCheck } = await supabase.from('parents').select('*').eq('user_id', foundUser.id);
        const { data: dbCheck2 } = await supabase.from('parents').select('*').eq('school_generated_id', targetId);

        console.log(` - Exists in 'parents' by user_id? ${dbCheck.length > 0 ? 'YES' : 'NO'}`);
        console.log(` - Exists in 'parents' by generated_id? ${dbCheck2.length > 0 ? 'YES' : 'NO'}`);

        if (dbCheck.length === 0 && dbCheck2.length === 0) {
            console.log('\nRECOMMENDED ACTION: Create "parents" record for this user.');
        }

    } else {
        console.log(`\n❌ Could not find any auth user with metadata school_generated_id = ${targetId}`);
        console.log('Listing some potential candidates (Email contains "parent"):');
        users.filter(u => u.email.includes('parent')).forEach(u => {
            console.log(` - ${u.email} (ID: ${u.user_metadata.school_generated_id})`);
        });
    }
}

findOrphanedAuthUser();
