
const { createClient } = require('@supabase/supabase-js');
try { require('dotenv').config(); } catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function standardizeDemoStudent() {
    console.log('--- Standardizing Demo Student ---');

    const MAIN_ID = '11111111-1111-1111-1111-111111111111';
    const NEW_GEN_ID = 'OLISKEY_MAIN_STD_0001';
    const EMAIL = 'student@demo.com';

    // 1. Delete duplicates (All students with email 'student@demo.com' except MAIN_ID)
    console.log('1. Deleting duplicates...');
    const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('email', EMAIL)
        .neq('id', MAIN_ID);

    if (deleteError) console.error('Error deleting duplicates:', deleteError);
    else console.log('✅ Duplicates deleted.');

    // 2. Update Main Student Record
    console.log('2. Updating Main Student Record...');
    const { error: updateError } = await supabase
        .from('students')
        .update({
            school_generated_id: NEW_GEN_ID,
            grade: 10,
            section: 'A', // Ensure a section exists
            name: 'Demo Student' // Ensure name is standard
        })
        .eq('id', MAIN_ID);

    if (updateError) console.error('Error updating student:', updateError);
    else console.log(`✅ Student updated: ID -> ${NEW_GEN_ID}, Grade -> 10`);

    // 3. Update Auth Metadata
    console.log('3. Updating Auth Metadata...');
    const { error: authError } = await supabase.auth.admin.updateUserById(
        MAIN_ID,
        { user_metadata: { school_generated_id: NEW_GEN_ID, grade: 10 } }
    );

    if (authError) console.error('Error updating Auth:', authError);
    else console.log('✅ Auth Metadata updated.');

    // 4. Verify Parent Link
    console.log('4. Verifying Parent Link...');
    const PARENT_ID = '33333333-3333-3333-3333-333333333333';

    // Check if link exists
    const { data: links } = await supabase
        .from('parent_children')
        .select('*')
        .eq('parent_id', PARENT_ID)
        .eq('student_id', MAIN_ID);

    if (!links || links.length === 0) {
        console.log('Creating parent-child link...');
        const { error: linkError } = await supabase
            .from('parent_children')
            .insert({ parent_id: PARENT_ID, student_id: MAIN_ID });

        if (linkError) console.error('Error creating link:', linkError);
        else console.log('✅ Parent-Student link created.');
    } else {
        console.log('✅ Parent-Student link already exists.');
    }
}

standardizeDemoStudent();
