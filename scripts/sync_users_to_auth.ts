/**
 * Sync Users to Supabase Authentication
 * 
 * This script reads all users from your 'users' table and creates
 * corresponding Supabase Auth users + auth_accounts entries.
 * 
 * Run this script to backfill existing users into Supabase Authentication.
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Need service role key

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials!');
    console.log('Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

interface User {
    id: number;
    email: string;
    name: string;
    role: string;
}

/**
 * Generate username from name and role
 */
function generateUsername(fullName: string, role: string): string {
    const cleaned = fullName.toLowerCase().trim().replace(/\s+/g, '.');
    return `${role.charAt(0).toLowerCase()}${cleaned}`;
}

/**
 * Generate password from surname
 */
function generatePassword(fullName: string): string {
    const nameParts = fullName.trim().split(/\s+/);
    const surname = nameParts[nameParts.length - 1];
    return `${surname.toLowerCase()}1234`;
}

/**
 * Sync a single user to Supabase Authentication
 */
async function syncUserToAuth(user: User): Promise<boolean> {
    try {
        console.log(`\n📝 Processing: ${user.name} (${user.email})`);

        const username = generateUsername(user.name, user.role);
        const password = generatePassword(user.name);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if auth account already exists in custom table
        const { data: existingAuthAccount } = await supabase
            .from('auth_accounts')
            .select('id, username')
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingAuthAccount) {
            console.log(`   ⏭️  Auth account already exists: ${existingAuthAccount.username}`);
        }

        // Check if Supabase Auth user exists
        const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error(`   ❌ Error checking auth users:`, listError.message);
            return false;
        }

        const existingAuthUser = authUsers.users.find(u => u.email === user.email);

        if (existingAuthUser) {
            console.log(`   ✅ Supabase Auth user already exists: ${user.email}`);

            // Still create auth_accounts entry if missing
            if (!existingAuthAccount) {
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
                    console.log(`   ✅ Created auth_accounts entry: ${username}`);
                }
            }

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
            console.error(`   ❌ Error creating Supabase Auth user:`, authError.message);
            return false;
        }

        console.log(`   ✅ Created Supabase Auth user: ${user.email}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🔑 Username: ${username}`);
        console.log(`   🔒 Password: ${password}`);

        // Create auth_accounts entry if it doesn't exist
        if (!existingAuthAccount) {
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
                console.log(`   ✅ Created auth_accounts entry: ${username}`);
            }
        }

        return true;

    } catch (error: any) {
        console.error(`   ❌ Error syncing user:`, error.message);
        return false;
    }
}

/**
 * Main sync function
 */
async function syncAllUsers() {
    console.log('🚀 Starting user sync to Supabase Authentication...\n');
    console.log('━'.repeat(60));

    try {
        // Fetch all users from the users table
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

        console.log(`📊 Found ${users.length} user(s) to process\n`);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const user of users) {
            const success = await syncUserToAuth(user);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n' + '━'.repeat(60));
        console.log('\n✨ Sync completed!\n');
        console.log(`📊 Summary:`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📝 Total processed: ${users.length}`);
        console.log('\n' + '━'.repeat(60));

        // Show verification query
        console.log('\n📋 To verify sync, run this query in Supabase SQL Editor:\n');
        console.log(`SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    aa.username,
    aa.is_active,
    CASE 
        WHEN aa.id IS NOT NULL THEN '✅'
        ELSE '❌'
    END as has_auth_account
FROM users u
LEFT JOIN auth_accounts aa ON aa.user_id = u.id
ORDER BY u.id;`);

        console.log('\n✅ Check Supabase Dashboard → Authentication → Users to see synced users!');

    } catch (error: any) {
        console.error('\n❌ Fatal error:', error.message);
    }
}

// Run the sync
syncAllUsers()
    .then(() => {
        console.log('\n🎉 Done! You can now check the Supabase Authentication dashboard.');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Script failed:', error);
        process.exit(1);
    });
