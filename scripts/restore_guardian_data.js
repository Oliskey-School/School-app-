
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function restore() {
    console.log("Starting Restore...");

    // 1. Find Student 'olamide'
    const { data: stds } = await supabase.from('students').select('id').ilike('name', '%olamide%');
    if (!stds || !stds.length) { console.error("Student not found"); return; }
    const studentId = stds[0].id;
    console.log(`Found Student ID: ${studentId}`);

    // Data from User's previous attempt
    const gName = 'Mr Ola';
    const gEmail = 'oliskeylee@gmail.com';
    const gPhone = '09049417103';

    // 2. Ensure User Exists
    let parentUserId;
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', gEmail).maybeSingle();
    if (existingUser) {
        console.log("User exists.");
        parentUserId = existingUser.id;
    } else {
        console.log("Creating User...");
        const { data: newUser, error: uErr } = await supabase.from('users').insert({
            email: gEmail, name: gName, role: 'Parent', avatar_url: `https://i.pravatar.cc/150?u=${gName}`
        }).select().single();
        if (uErr) { console.error("User Create Failed", uErr); return; }
        parentUserId = newUser.id;
    }

    // 3. Ensure Parent Profile Exists
    let parentId;
    const { data: existingProfile } = await supabase.from('parents').select('id').eq('user_id', parentUserId).maybeSingle();
    if (existingProfile) {
        console.log("Parent Profile exists.");
        parentId = existingProfile.id;
    } else {
        console.log("Creating Parent Profile...");
        const { data: newProfile, error: pErr } = await supabase.from('parents').insert({
            user_id: parentUserId, name: gName, email: gEmail, phone: gPhone, avatar_url: `https://i.pravatar.cc/150?u=${gName}`
        }).select().single();
        if (pErr) { console.error("Profile Create Failed", pErr); return; }
        parentId = newProfile.id;
    }

    // 4. Link
    console.log(`Linking Parent ${parentId} to Student ${studentId}...`);
    const { error: linkErr } = await supabase.from('parent_children').insert({
        parent_id: parentId, student_id: studentId
    });
    if (linkErr) {
        // Ignore duplicate key error, log others
        if (linkErr.code !== '23505') console.error("Link Failed:", linkErr);
        else console.log("Link already exists.");
    } else {
        console.log("Link Created Successfully.");
    }

    // 5. Verify Frontend Syntax
    console.log("Verifying Frontend Query Syntax...");
    const { data: verifyData, error: verifyErr } = await supabase
        .from('parent_children')
        .select(`
            parents (
                name,
                email,
                phone
            )
        `)
        .eq('student_id', studentId)
        .maybeSingle();

    if (verifyErr) {
        console.error("Frontend Syntax Check FAILED:", verifyErr);
        process.exit(1);
    } else {
        console.log("Frontend Syntax Check PASSED. Data:", JSON.stringify(verifyData));
        process.exit(0);
    }
}

restore();
