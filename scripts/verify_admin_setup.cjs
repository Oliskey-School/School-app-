
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyAdminLoginAndProfile() {
    console.log('🔍 Verifying Admin Login & Profile (Client-side simulation)...');

    const email = 'admin@school.com';
    const password = 'password123';

    // 1. Attempt Login
    console.log(`\n1. Attempting login as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error('❌ Login Failed:', authError.message);
        console.log('👉 This means the user does not exist in Supabase Auth or wrong password.');
        console.log('   You may need to run the "sync_users_to_auth.js" script or sign up manually.');
        return;
    }

    const user = authData.user;
    console.log('✅ Login Successful!');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Role (Metadata): ${user.user_metadata.role}`);

    // 2. Check Profile (using the logged in user's token implicitly handled by supabase client? 
    // actually in node we might need to be careful, but supabase-js client maintains session usually if instance is same)

    console.log(`\n2. Checking 'profiles' table for this user...`);

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('❌ Error fetching profile:', profileError.message);
        console.error('   Details:', profileError);
        if (profileError.code === 'PGRST116') {
            console.error('   -> The profile record DOES NOT EXIST in the public.profiles table.');
            console.log('   -> This is why RLS is blocking you. The user exists in Auth, but not in the database table.');
        }
        return;
    }

    console.log('✅ Profile found!', profile);

    if (profile.role !== 'admin') {
        console.error(`❌ Role mismatch in Profile! Expected 'admin', found '${profile.role}'`);
        console.log('   -> This might cause permission issues if policies check for "admin".');
    } else {
        console.log('✅ Role in Profile is "admin".');
    }

    // 3. Test RLS: Try to insert a dummy fee (and then delete it)
    // This confirms if the user TRULY has permission
    console.log(`\n3. Testing Permissions: Attempting to query fees table...`);
    const { data: fees, error: feeError } = await supabase.from('fees').select('id').limit(1);

    if (feeError) {
        console.error('❌ Reading Fees Failed:', feeError.message);
    } else {
        console.log('✅ Can read fees table. RLS seems okay for SELECT.');
    }
}

verifyAdminLoginAndProfile();
