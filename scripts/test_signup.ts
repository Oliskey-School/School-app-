
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("❌ Missing .env vars");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    console.log("Testing SignUp...");
    const email = `test.signup.${Date.now()}@school.com`;
    const password = 'password123';

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { role: 'teacher', full_name: 'Test Teacher' } // metadata
        }
    });

    if (error) {
        console.error("❌ SignUp Error:", error.message);
    } else {
        console.log("✅ SignUp Success!");
        if (data.session) {
            console.log("🎉 SESSION RECEIVED! Auto-confirm is ENABLED.");
        } else {
            console.log("⚠️ No session. verification email sent?");
            console.log("User Ident:", data.user?.identities);
        }
    }
}

run();
