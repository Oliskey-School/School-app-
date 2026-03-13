const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!serviceKey) {
    console.error("NO SERVICE KEY FOUND");
    process.exit(1);
}

// Create client with service role key, explicitly bypassing RLS
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function main() {
    const { data: authData } = await supabaseAdmin.auth.signInWithPassword({
        email: 'student@demo.com',
        password: 'password123'
    });

    if (!authData || !authData.user) {
        console.error("Login failed for student@demo.com");
        return;
    }

    const userId = authData.user.id;
    const { data: schools } = await supabaseAdmin.from('schools').select('id').limit(1);
    const schoolId = schools[0].id;

    // Check if student exists
    const { data: existing } = await supabaseAdmin.from('students').select('id').eq('user_id', userId);
    if (existing && existing.length > 0) {
        console.log("Student profile already exists.");
        return;
    }

    const { data: student, error } = await supabaseAdmin.from('students').insert({
        user_id: userId,
        school_id: schoolId,
        name: 'Demo Student',
        email: 'student@demo.com',
        grade: 1,
        section: 'A'
    }).select('*');

    console.log('Created student profile via admin:', student, error);
}

main();
