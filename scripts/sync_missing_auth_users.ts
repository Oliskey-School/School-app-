
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Script to sync local DB users (parents, students, teachers) to Supabase Auth
// Usage: npx tsx scripts/sync_missing_auth_users.ts

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; // Try service key first for admin actions if available, else anon (might fail for admin creates)

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
}

// NOTE: Creating users usually requires SERVICE_ROLE_KEY. If only ANON key is present, this might fail unless SignUp is open.
// But for "fixing broken login", we usually need admin rights.
console.log('Using Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncUsers() {
    console.log('🔄 Starting User Sync...');

    // 1. Fetch all Parents
    const { data: parents } = await supabase.from('parents').select('email, name, id');
    if (parents) {
        console.log(`Found ${parents.length} parents in DB.`);
        for (const p of parents) {
            if (!p.email) continue;
            await ensureAuthUser(p.email, 'password123', 'parent', p.name, p.id);
        }
    }

    // 2. Fetch all Students
    const { data: students } = await supabase.from('students').select('email, name, id');
    if (students) {
        console.log(`Found ${students.length} students in DB.`);
        for (const s of students) {
            if (!s.email) continue;
            await ensureAuthUser(s.email, 'password123', 'student', s.name, s.id);
        }
    }

    // 3. Fetch all Teachers
    const { data: teachers } = await supabase.from('teachers').select('email, name, id');
    if (teachers) {
        console.log(`Found ${teachers.length} teachers in DB.`);
        for (const t of teachers) {
            if (!t.email) continue;
            await ensureAuthUser(t.email, 'password123', 'teacher', t.name, t.id);
        }
    }

    console.log('✅ Sync Complete.');
}

async function ensureAuthUser(email: string, password: string, role: string, name: string, dbId: any) {
    // 1. Check if exists
    // We can't easily "check" existence without Admin API listing users, which fails with Anon key.
    // Instead we try to Sign Up. If it fails (User already registered), we are good.

    // Attempt Admin Create (works if Service Key)
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, full_name: name, start_id: dbId }
    });

    if (error) {
        // If error is "User already registered", that's fine.
        if (error.message.includes('already registered') || error.message.includes('unique constraint')) {
            // console.log(`  - User ${email} already exists.`);
        } else {
            // Fallback: Try public Sign Up (works if Anon Key)
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { role, full_name: name }
                }
            });

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    // console.log(`  - User ${email} already exists (via signUp).`);
                } else {
                    console.warn(`  ❌ Failed to create ${email}: ${signUpError.message}`);
                }
            } else {
                console.log(`  ✅ Created auth user for: ${email}`);
            }
        }
    } else {
        console.log(`  ✅ Created auth user for: ${email}`);
    }
}

syncUsers();
