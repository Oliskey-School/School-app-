/**
 * Apply User Synchronization Fix
 * This script runs the SYNC_AUTH_USERS.sql to synchronize Auth users with public tables
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySyncScript() {
    console.log('🔄 Starting User Synchronization Fix...\n');

    try {
        // Read the SQL script
        const sqlPath = join(__dirname, '..', 'sql', 'SYNC_AUTH_USERS.sql');
        const sqlScript = readFileSync(sqlPath, 'utf-8');

        console.log('📄 Loaded SYNC_AUTH_USERS.sql');
        console.log('📊 Script will:');
        console.log('   1. Create delete_user_by_email() RPC function');
        console.log('   2. Install triggers for Auth → Public sync');
        console.log('   3. Repair existing orphaned Auth users');
        console.log('   4. Install deletion sync triggers\n');

        // Split the script into individual statements
        // We need to execute them separately because some commands can't be in transactions
        const statements = sqlScript
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];

            // Skip empty statements and comments
            if (!stmt || stmt.startsWith('--') || stmt.match(/^SELECT\s+'✅/i)) {
                continue;
            }

            try {
                const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });

                if (error) {
                    // Try direct execution for DDL statements
                    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`
                        },
                        body: JSON.stringify({ sql_query: stmt })
                    });

                    if (!response.ok) {
                        console.warn(`⚠️  Statement ${i + 1} may need manual execution`);
                        errorCount++;
                    } else {
                        successCount++;
                    }
                } else {
                    successCount++;
                }
            } catch (err) {
                console.warn(`⚠️  Error on statement ${i + 1}:`, err.message);
                errorCount++;
            }
        }

        console.log(`\n✅ Script execution completed!`);
        console.log(`   Successful statements: ${successCount}`);
        if (errorCount > 0) {
            console.log(`   ⚠️  Statements that may need manual review: ${errorCount}`);
            console.log('\n📝 Note: Some statements require SECURITY DEFINER or admin privileges.');
            console.log('   Please run SYNC_AUTH_USERS.sql manually in Supabase SQL Editor if needed.\n');
        }

        // Verify the sync worked
        console.log('\n🔍 Verifying synchronization...');

        const { count: usersCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        const { count: authAccountsCount } = await supabase
            .from('auth_accounts')
            .select('*', { count: 'exact', head: true });

        console.log(`\n📊 Results:`);
        console.log(`   Public Users: ${usersCount}`);
        console.log(`   Auth Accounts: ${authAccountsCount}`);

        if (usersCount === authAccountsCount) {
            console.log('\n✅ SUCCESS! User counts are synchronized!\n');
        } else {
            console.log('\n⚠️  Counts differ. You may need to run the SQL script manually in Supabase Dashboard.\n');
        }

    } catch (error) {
        console.error('\n❌ Error applying sync script:', error.message);
        console.log('\n📝 MANUAL STEPS REQUIRED:');
        console.log('   1. Open Supabase Dashboard: ' + supabaseUrl);
        console.log('   2. Go to SQL Editor');
        console.log('   3. Copy contents of sql/SYNC_AUTH_USERS.sql');
        console.log('   4. Paste and Run\n');
        process.exit(1);
    }
}

applySyncScript();
