
/**
 * Cleanup Orphaned Auth Users
 * 
 * This script finds Supabase Auth users that do not exist in the public 'users' table
 * and deletes them. This fixes the issue of "deleted" students still showing up in Authentication.
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://nijgkstffuqxqltlmchu.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_mJ0tC2ilgLtPHBV6te7enA_es-04yAz';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanupOrphanedUsers() {
    console.log('🧹 Starting cleanup of orphaned Auth users...');

    try {
        // 1. Fetch all Public Users
        const { data: publicUsers, error: publicError } = await supabase
            .from('users')
            .select('email');

        if (publicError) throw publicError;

        const publicEmails = new Set(publicUsers.map(u => u.email));
        console.log(`📊 Found ${publicEmails.size} active users in public database.`);

        // 2. Fetch all Auth Users
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const authUsers = authData.users;
        console.log(`🔐 Found ${authUsers.length} users in Authentication.`);

        // 3. Identify Orphans
        const orphans = authUsers.filter(u => !publicEmails.has(u.email));

        if (orphans.length === 0) {
            console.log('✅ No orphaned users found. Database is clean.');
            return;
        }

        console.log(`⚠️  Found ${orphans.length} orphaned users to delete:`);
        orphans.forEach(u => console.log(`   - ${u.email} (${u.user_metadata?.full_name || 'No Name'})`));

        // 4. Delete Orphans
        console.log('\n🗑️  Deleting orphans...');
        for (const orphan of orphans) {
            const { error: deleteError } = await supabase.auth.admin.deleteUser(orphan.id);
            if (deleteError) {
                console.error(`   ❌ Failed to delete ${orphan.email}: ${deleteError.message}`);
            } else {
                console.log(`   ✅ Deleted: ${orphan.email}`);
            }
        }

        console.log('\n🎉 Cleanup complete!');

    } catch (err) {
        console.error('Error during cleanup:', err);
    }
}

cleanupOrphanedUsers();
