/**
 * Debug User Count Mismatch
 * Checks for duplicates and orphaned records causing the count difference
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function debugUserCounts() {
    console.log('🔍 Debugging User Count Mismatch...\n');

    try {
        // 1. Check auth.users count (via auth_accounts as proxy since we can't query auth.users directly)
        console.log('📊 Checking counts...\n');

        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, name, role, created_at');

        const { data: authAccounts, error: authError } = await supabase
            .from('auth_accounts')
            .select('id, email, username, user_type, user_id');

        if (usersError || authError) {
            console.error('Error fetching data:', usersError || authError);
            return;
        }

        console.log(`📈 Current Counts:`);
        console.log(`   Users table: ${users?.length || 0}`);
        console.log(`   Auth Accounts table: ${authAccounts?.length || 0}`);
        console.log(`   Supabase Auth (from screenshot): 20\n`);

        // 2. Check for duplicates in users table
        const emailCounts = {};
        users?.forEach(user => {
            emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
        });

        const duplicateEmails = Object.entries(emailCounts)
            .filter(([email, count]) => count > 1);

        if (duplicateEmails.length > 0) {
            console.log('❌ DUPLICATE EMAILS in users table:');
            duplicateEmails.forEach(([email, count]) => {
                console.log(`   ${email}: ${count} entries`);
            });
            console.log('');
        } else {
            console.log('✅ No duplicate emails in users table\n');
        }

        // 3. Check for orphaned auth_accounts (no matching user_id)
        const orphanedAuthAccounts = authAccounts?.filter(auth => {
            return !users?.some(user => user.id === auth.user_id);
        });

        if (orphanedAuthAccounts?.length > 0) {
            console.log('❌ ORPHANED auth_accounts (no matching user):');
            orphanedAuthAccounts.forEach(auth => {
                console.log(`   ${auth.email} (user_id: ${auth.user_id})`);
            });
            console.log('');
        } else {
            console.log('✅ No orphaned auth_accounts\n');
        }

        // 4. Check for users without auth_accounts
        const usersWithoutAuth = users?.filter(user => {
            return !authAccounts?.some(auth => auth.email === user.email);
        });

        if (usersWithoutAuth?.length > 0) {
            console.log('⚠️  Users WITHOUT auth_accounts:');
            usersWithoutAuth.forEach(user => {
                console.log(`   ${user.email} (${user.role})`);
            });
            console.log('');
        }

        // 5. List all users by role
        console.log('📋 User Breakdown by Role:');
        const roleBreakdown = {};
        users?.forEach(user => {
            roleBreakdown[user.role] = (roleBreakdown[user.role] || 0) + 1;
        });
        Object.entries(roleBreakdown).forEach(([role, count]) => {
            console.log(`   ${role}: ${count}`);
        });
        console.log('');

        // 6. Identify the source of extra users
        const extraUsers = users?.length - 20; // 20 is the Auth count
        console.log(`🔢 Analysis:`);
        console.log(`   Expected (from Auth): 20`);
        console.log(`   Actual (in users table): ${users?.length}`);
        console.log(`   Extra users: ${extraUsers}`);
        console.log('');

        if (extraUsers > 0) {
            console.log('💡 Likely causes:');
            console.log('   1. Orphaned records that should be deleted');
            console.log('   2. Duplicate records created during sync');
            console.log('   3. Test users created in public tables but not in Auth\n');
        }

        // 7. Show sample of potential problem records
        if (extraUsers > 0) {
            console.log('🔍 Most Recent Users (potential duplicates):');
            const recentUsers = [...(users || [])]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 10);

            recentUsers.forEach(user => {
                const hasAuth = authAccounts?.some(auth => auth.email === user.email);
                console.log(`   ${user.email} (${user.role}) ${!hasAuth ? '⚠️ NO AUTH' : '✅'}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugUserCounts();
