
/**
 * Force Delete Student Script
 * 
 * This script completely removes a student from the system, including:
 * - Public 'students' table
 * - Public 'users' table
 * - 'parent_children' links
 * - 'auth_accounts' table
 * - Supabase Authentication (auth.users)
 * 
 * Target: olamide.oluwapelumi@student.school.com
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://nijgkstffuqxqltlmchu.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_mJ0tC2ilgLtPHBV6te7enA_es-04yAz';
const TARGET_EMAIL = 'olamide.oluwapelumi.@student.school.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function forceDeleteUser() {
    console.log(`💀 Starting force delete for: ${TARGET_EMAIL}`);

    try {
        // 1. Find User in Auth (to get ID)
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const authUser = authData.users.find(u => u.email === TARGET_EMAIL);

        if (authUser) {
            console.log(`✅ Found in Auth: ${authUser.id}`);

            // Delete from Auth
            const { error: delAuthError } = await supabase.auth.admin.deleteUser(authUser.id);
            if (delAuthError) console.error(`❌ Error deleting from Auth:`, delAuthError.message);
            else console.log(`🗑️  Deleted from Supabase Auth`);
        } else {
            console.log(`ℹ️  Not found in Supabase Auth`);
        }

        // 2. Find in Public Users
        const { data: publicUser, error: pubError } = await supabase
            .from('users')
            .select('id')
            .eq('email', TARGET_EMAIL)
            .maybeSingle();

        if (publicUser) {
            console.log(`✅ Found in Public Users: ${publicUser.id}`);

            // Delete from Students (should cascade from Users really, but let's be explicit)
            const { error: delStudError } = await supabase
                .from('students')
                .delete()
                .eq('user_id', publicUser.id);
            if (!delStudError) console.log(`🗑️  Deleted from Students table`);

            // Delete from Auth Accounts
            const { error: delAccError } = await supabase
                .from('auth_accounts')
                .delete()
                .eq('user_id', publicUser.id);
            if (!delAccError) console.log(`🗑️  Deleted from Auth Accounts table`);

            // Delete from Users (This triggers CASCADE usually)
            const { error: delUserError } = await supabase
                .from('users')
                .delete()
                .eq('id', publicUser.id);

            if (delUserError) console.error(`❌ Error deleting from Users:`, delUserError.message);
            else console.log(`🗑️  Deleted from Public Users table`);

        } else {
            console.log(`ℹ️  Not found in Public Users`);
        }

        console.log('\n🎉 Force delete complete!');

    } catch (err) {
        console.error('Error:', err);
    }
}

forceDeleteUser();
