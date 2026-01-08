
import { createClient, User } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY or URL.");
    process.exit(1);
}

const supabase = createClient(url, key);

const roles = ['admin', 'teacher', 'parent', 'student', 'proprietor', 'inspector', 'examofficer', 'complianceofficer', 'counselor'];

async function run() {
    console.log("🚀 Setting up Demo Auth Users...");

    // Get all users first to avoid loop query
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError);
        return;
    }

    const allUsers = users as User[];

    for (const role of roles) {
        const email = `${role}@school.com`;
        const password = 'demo123';
        const name = `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`;

        const existing = allUsers?.find(user => user.email === email);

        if (existing) {
            console.log(`🔹 Updating ${email}`);
            await supabase.auth.admin.updateUserById(existing.id, {
                password: password,
                user_metadata: { role, user_type: role, full_name: name },
                email_confirm: true
            });

            // Ensure profile
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: existing.id,
                email: email,
                role: role,
                full_name: name,
                avatar_url: `https://i.pravatar.cc/150?u=${existing.id}`
            });
            if (profileError) console.error(`  ❌ Profile Upsert Error: ${profileError.message}`);

        } else {
            console.log(`✨ Creating ${email}`);
            const { data, error } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { role, user_type: role, full_name: name }
            });
            if (error) console.error(`❌ Error creating ${email}:`, error.message);
            // Trigger should catch this, but manual upsert of profile safety check could be done if needed
        }
    }
    console.log("✅ Demo Users Setup Complete.");
}

run();
