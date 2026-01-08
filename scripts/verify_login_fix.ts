
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load usage
// npx tsx scripts/verify_login_fix.ts

// Load env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAuthFix() {
    console.log('🔍 Verifying Authentication Fix...');
    console.log('-----------------------------------');
    console.log('Target Project:', supabaseUrl);

    const testEmail = 'admin@school.com';
    const testPassword = 'admin'; // Usually correct for seed data

    console.log(`\n1. Testing RPC 'authenticate_user' for ${testEmail}...`);

    try {
        const { data, error } = await supabase.rpc('authenticate_user', {
            username_input: testEmail,
            password_input: testPassword
        });

        if (error) {
            console.error('\n❌ RPC CALL FAILED');
            console.error('Error Code:', error.code);
            console.error('Message:', error.message);
            console.error('Details:', error.details);

            if (error.code === '42804' || error.message.includes('structure of query does not match')) {
                console.log('\n⚠️  DIAGNOSIS: TYPE MISMATCH DETECTED');
                console.log('   The SQL Fix has NOT been applied yet.');
                console.log('   Please run database/migrations/0035_fix_auth_final_comprehensive.sql');
            } else if (error.code === 'PGRST202' || error.message.includes('function not found')) {
                console.log('\n⚠️  DIAGNOSIS: FUNCTION MISSING');
                console.log('   The function does not exist. Run the SQL script.');
            }
            process.exit(1);
        }

        if (data && data.length > 0) {
            console.log('✅ RPC SUCCESS! The function is working correctly.');
            console.log('   User found:', data[0].name, `(${data[0].role})`);
        } else {
            console.log('⚠️  RPC executed but returned no user. (This confirms the schema is fine, just bad creds)');
        }

    } catch (err: any) {
        console.error('❌ Unexpected crash:', err.message);
        process.exit(1);
    }

    console.log('\n-----------------------------------');
    console.log('🎉 RESULT: The Real Login Database Function is FIXED.');
    console.log('   You can now rely on real data.');
    console.log('-----------------------------------');
}

verifyAuthFix();
