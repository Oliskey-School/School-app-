
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from current directory
dotenv.config({ path: path.join(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing Supabase URL or Key in .env");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    console.log("🔍 Debugging Profiles & Roles...");

    // 1. Fetch all profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error("❌ Error fetching profiles:", error);
        return;
    }

    console.log(`✅ Found ${profiles.length} profiles.`);

    // 2. Filter for teachers
    const teachers = profiles.filter(p => p.email?.includes('teacher') || p.role?.toLowerCase()?.includes('teacher'));

    console.log("\n--- Teacher Profiles ---");
    if (teachers.length === 0) {
        console.log("⚠️ No profiles found with 'teacher' in email or role.");
    }

    teachers.forEach(p => {
        console.log(`ID: ${p.id}`);
        console.log(`Email: ${p.email}`);
        console.log(`Role: '${p.role}' (Type: ${typeof p.role})`); // Check for extra spaces or weird chars
        console.log(`Updated: ${p.updated_at}`);
        console.log("------------------------");
    });

    // 3. Check for 'student' default problem
    const defaultStudents = profiles.filter(p => p.role === 'student' && (p.email?.includes('teacher') || p.email?.includes('admin')));
    if (defaultStudents.length > 0) {
        console.log("\n⚠️ DETECTED POTENTIAL MISCONFIGURED PROFILES (Should be Teacher/Admin but are Student):");
        defaultStudents.forEach(p => console.log(`${p.email} -> ${p.role}`));
    }

    // 4. Test RLS Function Logic specifically
    console.log("\n--- Testing get_user_role function ---");
    if (teachers.length > 0) {
        const testId = teachers[0].id;
        const { data: roleFromFn, error: rpcError } = await supabase.rpc('get_user_role', { user_id: testId });

        if (rpcError) {
            console.log("❌ RPC Call Failed:", rpcError.message);
        } else {
            console.log(`Function get_user_role('${testId}') returned: '${roleFromFn}'`);
            const policyCheck = ['teacher', 'admin', 'proprietor', 'principal'].includes(roleFromFn);
            console.log(`Would satisfy IN ('teacher', 'admin'...) clause? ${policyCheck ? 'YES ✅' : 'NO ❌'}`);
        }
    }
}

run();
