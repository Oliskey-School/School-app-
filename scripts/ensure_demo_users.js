
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

const MOCK_USERS = [
    {
        email: 'demo_admin@school.com',
        password: 'password123',
        role: 'admin',
        full_name: 'Demo Admin',
        school_id: DEMO_SCHOOL_ID
    },
    {
        email: 'demo_teacher@school.com',
        password: 'password123',
        role: 'teacher',
        full_name: 'Demo Teacher',
        school_id: DEMO_SCHOOL_ID
    },
    {
        email: 'demo_parent@school.com',
        password: 'password123',
        role: 'parent',
        full_name: 'Demo Parent',
        school_id: DEMO_SCHOOL_ID
    },
    {
        email: 'demo_student@school.com',
        password: 'password123',
        role: 'student',
        full_name: 'Demo Student',
        school_id: DEMO_SCHOOL_ID
    }
];

async function ensureDemoUsers() {
    console.log('Ensuring demo users exist...');

    for (const user of MOCK_USERS) {
        console.log(`Checking/Creating user: ${user.email} (${user.role})`);

        // 1. Check if user exists in Auth
        // Note: With service key we use admin api. 
        // If using anon key, we can't search users easily, but we can try to SignIn.
        // However, I suspect the env file has a service key labeled as SUPABASE_SERVICE_KEY
        // Let's assume we have admin privileges.

        let userId;

        // We try to list users (requires service role)
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error("List users failed (check if service key is valid):", listError.message);
            // Fallback: This script might be running with anon key? 
            // If so, we can't proceed properly using admin API.
            // But the .env showed SUPABASE_SERVICE_KEY.
            return;
        }

        const existingUser = users.users.find(u => u.email === user.email);

        if (existingUser) {
            console.log(`User ${user.email} already exists. Updating password/metadata...`);
            userId = existingUser.id;

            const { error: updateError } = await supabase.auth.admin.updateUserById(
                userId,
                {
                    password: user.password,
                    user_metadata: {
                        role: user.role,
                        full_name: user.full_name,
                        school_id: user.school_id,
                        is_demo: true
                    },
                    app_metadata: {
                        role: user.role,
                        school_id: user.school_id,
                        provider: 'email'
                    },
                    email_confirm: true
                }
            );

            if (updateError) console.error(`Failed to update ${user.email}:`, updateError.message);
            else console.log(`Updated ${user.email} successfully.`);

        } else {
            console.log(`Creating user ${user.email}...`);

            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: {
                    role: user.role,
                    full_name: user.full_name,
                    school_id: user.school_id,
                    is_demo: true
                },
                app_metadata: {
                    role: user.role,
                    school_id: user.school_id,
                    provider: 'email'
                }
            });

            if (createError) {
                console.error(`Failed to create ${user.email}:`, createError.message);
                continue;
            }

            userId = newUser.user.id;
            console.log(`Created ${user.email} with ID: ${userId}`);
        }

        // 2. Ensure Profile Exists in public.profiles (Using Service Role RPC or direct Insert if RLS allows/Service Key bypasses)
        // Supabase Service Key bypasses RLS, so we can insert directly.

        const { data: profile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (!profile) {
            console.log(`Creating profile for ${user.email}...`);
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{
                    id: userId,
                    role: user.role,
                    full_name: user.full_name,
                    school_id: user.school_id
                }]);

            if (insertError) console.error(`Failed to create profile:`, insertError.message);
        } else {
            console.log(`Profile exists for ${user.email}. Syncing school_id...`);
            const { error: updateProfileError } = await supabase
                .from('profiles')
                .update({
                    school_id: user.school_id,
                    role: user.role
                })
                .eq('id', userId);

            if (updateProfileError) console.error(`Failed to update profile:`, updateProfileError.message);
        }
    }
}

ensureDemoUsers();
