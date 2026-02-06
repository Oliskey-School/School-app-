
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Use VITE_ env vars if available, else fallbacks
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase credentials (URL or Anon Key)');
    console.log('Available Env:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAnonLogin() {
    console.log('🚀 Starting Anon Login Verification...');
    console.log(`📡 URL: ${SUPABASE_URL}`);
    console.log(`🔑 Key starts with: ${SUPABASE_ANON_KEY?.substring(0, 10)}...`);

    try {
        const email = 'admin@demo.com';
        const password = 'password123';

        console.log(`👤 Attempting login for: ${email}`);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('❌ Login Failed:', error.message);
            console.error('Detailed Error:', error);
            if ((error as any).status) console.error('Status:', (error as any).status);
        } else {
            console.log('✅ Login Successful!');
            console.log('User ID:', data.user?.id);
            console.log('Token starts with:', data.session?.access_token.substring(0, 20));
        }

    } catch (err) {
        console.error('❌ Unexpected Script Error:', err);
    }
}

testAnonLogin();
