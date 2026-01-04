/**
 * Sync Users to Supabase Authentication (JavaScript Version)
 * 
 * This script reads all users from your 'users' table and creates
 * corresponding Supabase Auth users.
 * 
 * Usage:
 *   node scripts/sync_users_to_auth.js
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Supabase configuration
const SUPABASE_URL = 'https://nijgkstffuqxqltlmchu.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_mJ0tC2ilgLtPHBV6te7enA_es-04yAz';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.error('━'.repeat(60));
    console.error('❌ CONFIGURATION REQUIRED!');
    console.error('━'.repeat(60));
    console.error('\nYou need to set your Supabase credentials:\n');
    console.error('Option 1: Edit this file and replace:');
    console.error('  - SUPABASE_URL with your Supabase project URL');
    console.error('  - SUPABASE_SERVICE_KEY with your service role key\n');
    console.error('Option 2: Set environment variables:');
    console.error('  - EXPO_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY\n');
    console.error('📍 Find these in: Supabase Dashboard → Settings → API');
    console.error('━'.repeat(60));
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Generate username from name and role
 */
function generateUsername(fullName, role) {
    const cleaned = fullName.toLowerCase().trim().replace(/\s+/g, '.');
    return `${role.charAt(0).toLowerCase()}${cleaned}`;
}

/**
 * Generate password from surname
 */
function generatePassword(fullName) {
    const nameParts = fullName.trim().split(/\s+/);
    const surname = nameParts[nameParts.length - 1];
    return `${surname.toLowerCase()}1234`;
}

/**
 * Sync a single user to Supabase Authentication
 */
async function syncUserToAuth(user) {
    try {
        console.log(`\n📝 Processing: ${user.name} (${user.email})`);

        const username = generateUsername(user.name, user.role);
        const password = generatePassword(user.name);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Checked if Supabase Auth user exists
        const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error(`   ❌ Error checking auth users:`, listError.message);
            return false;
        }

        const existingAuthUser = authUsers.users.find(u => u.email === user.email);

        if (existingAuthUser) {
            console.log(`   ✅ Supabase Auth user already exists`);
            return true;
        }

        // Create Supabase Auth user
        console.log(`   🔐 Creating Supabase Auth user...`);
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: user.name,
                user_type: user.role,
                username: username,
            }
        });

        if (authError) {
            console.error(`   ❌ Error:`, authError.message);
            return false;
        }

        console.log(`   ✅ Created successfully!`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🔑 Username: ${username}`);
        console.log(`   🔒 Password: ${password}`);

        // Also create/update auth_accounts entry
        const { data: existingAccount } = await supabase
            .from('auth_accounts')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!existingAccount) {
            const { error: dbError } = await supabase
                .from('auth_accounts')
                .insert([{
                    username,
                    password: hashedPassword,
                    user_type: user.role,
                    email: user.email,
                    user_id: user.id,
                    is_active: true,
                    is_verified: true
                }]);

            if (dbError) {
                console.error(`   ⚠️  Could not create auth_accounts entry:`, dbError.message);
            } else {
                console.log(`   ✅ Created auth_accounts entry`);
            }
        }

        return true;

    } catch (error) {
        console.error(`   ❌ Error:`, error.message);
        return false;
    }
}

/**
 * Main sync function
 */
async function syncAllUsers() {
    console.log('\n🚀 Syncing Users to Supabase Authentication\n');
    console.log('━'.repeat(60));

    try {
        // Fetch all users
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, name, role')
            .order('id');

        if (error) {
            console.error('❌ Error fetching users:', error.message);
            return;
        }

        if (!users || users.length === 0) {
            console.log('ℹ️  No users found in the users table.');
            return;
        }

        console.log(`📊 Found ${users.length} user(s) to sync\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
            const success = await syncUserToAuth(user);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('\n' + '━'.repeat(60));
        console.log('\n✨ Sync Complete!\n');
        console.log(`📊 Summary:`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📝 Total: ${users.length}`);
        console.log('\n' + '━'.repeat(60));
        console.log('\n✅ Check: Supabase Dashboard → Authentication → Users');
        console.log('   You should now see all your users!\n');

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Check your Supabase URL and Service Key');
        console.error('2. Ensure you have admin permissions');
        console.error('3. Check your internet connection');
    }
}

// Run the sync
console.clear();
syncAllUsers()
    .then(() => {
        console.log('🎉 Done!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Script failed:', error.message);
        process.exit(1);
    });
