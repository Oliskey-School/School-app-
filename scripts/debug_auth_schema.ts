import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
    console.log("Testing Auth...");

    // 1. Test RPC authenticate_user (if it exists)
    console.log("\n1. Testing RPC 'authenticate_user' with admin@school.com / demo123 (email match)...");
    const { data: rpcData, error: rpcError } = await supabase.rpc('authenticate_user', {
        username_input: 'admin@school.com',
        password_input: 'demo123'
    });

    if (rpcError) console.error("RPC Error:", rpcError.message);
    else console.log("RPC Success:", rpcData);

    // 2. Test RPC with username 'admin' (if exists)
    console.log("\n2. Testing RPC 'authenticate_user' with 'admin' / demo123 (username match)...");
    const { data: rpcData2, error: rpcError2 } = await supabase.rpc('authenticate_user', {
        username_input: 'admin',
        password_input: 'demo123'
    });

    if (rpcError2) console.error("RPC Error:", rpcError2.message);
    else console.log("RPC Success:", rpcData2);

    // 3. Test Native Auth signInWithPassword
    console.log("\n3. Testing Native Auth signInWithPassword 'admin@school.com'...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@school.com',
        password: 'demo123'
    });

    if (authError) console.error("Auth matches Error:", authError.message);
    else if (authData.session) console.log("Auth Success: Session created for", authData.user.email);
    else console.log("Auth: No session (unexpected state)");
}

testAuth();
