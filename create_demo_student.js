const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);

async function init() {
    const email = 'student@demo.com';

    // Check if user exists
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    let user = users.find(u => u.email === email);

    if (!user) {
        console.log("User not found in Auth, creating...");
        const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { role: 'student' }
        });
        if (createErr) {
            console.error("Auth creation failed:", createErr);
            return;
        }
        user = authData.user;
    }

    const userId = user.id;
    console.log(`Auth User ID: ${userId}`);

    const { data: schools } = await supabase.from('schools').select('id').limit(1);
    if (!schools || schools.length === 0) {
        console.error("No schools found.");
        return;
    }
    const schoolId = schools[0].id;

    const { data: inserted, error: studentErr } = await supabase.from('students').insert({
        user_id: userId,
        school_id: schoolId,
        first_name: 'Test',
        last_name: 'Student',
        email: email,
        student_id: 'STU-12345',
        enrollment_date: new Date().toISOString()
    }).select('*');

    if (studentErr) {
        console.error("Student profile creation failed:", studentErr);
    } else {
        console.log("Demo student created successfully: ", inserted);
    }
}

init();
