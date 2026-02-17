
const { createClient } = require('@supabase/supabase-js');
try { require('dotenv').config(); } catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function fixSecondaryDemoStudent() {
    console.log('--- Fixing Secondary Demo Student ---');

    const SEC_ID = 'afcb1272-c390-4474-bf35-be319754b075';
    const NEW_GEN_ID = 'OLISKEY_MAIN_STD_0002';

    // Update DB
    const { error: updateError } = await supabase
        .from('students')
        .update({
            school_generated_id: NEW_GEN_ID,
            grade: 10,
            section: 'A'
        })
        .eq('id', SEC_ID);

    if (updateError) console.error('Error updating student:', updateError);
    else console.log(`✅ Secondary Student updated: ID -> ${NEW_GEN_ID}, Grade -> 10`);

    // Also try to update auth metadata if user exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const secUser = users.find(u => u.id === SEC_ID || u.email === 'demo_student@school.com');

    if (secUser) {
        console.log(`Found Auth User for secondary student: ${secUser.id}`);
        await supabase.auth.admin.updateUserById(secUser.id, {
            user_metadata: { school_generated_id: NEW_GEN_ID, grade: 10 }
        });
        console.log('✅ Auth Metadata updated.');
    } else {
        console.log('No Auth User found for secondary student (might be db-only record).');
    }
}

fixSecondaryDemoStudent();
