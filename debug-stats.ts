
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const EMAIL = 'teacher@demo.com';
const PASSWORD = 'password123';

async function debugTeacherStats() {
    console.log(`Logging in as ${EMAIL}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: EMAIL,
        password: PASSWORD,
    });

    if (authError || !authData.user) {
        console.error('Login failed:', authError?.message);
        return;
    }
    const userId = authData.user.id;
    console.log('Login successful. User ID:', userId);

    // 1. Get Teacher Profile
    const { data: teacherProfiles, error: profileError } = await supabase
        .from('teachers')
        .select('id, name, school_id')
        .eq('user_id', userId);

    if (profileError) {
        console.error('❌ Error fetching teacher profile:', profileError);
        return;
    }
    if (!teacherProfiles || teacherProfiles.length === 0) {
        console.log('No teacher profiles found for this user.');
        return;
    }
    const teacherProfile = teacherProfiles[0];
    const teacherId = teacherProfile.id;
    const schoolId = teacherProfile.school_id;
    console.log(`✅ Found Teacher Profile: ${teacherProfile.name} (ID: ${teacherId}, School ID: ${schoolId})`);

    // 2. Fetch Assignments via class_teachers (modern table)
    console.log('\n--- Fetching assignments via class_teachers ---');
    const { data: assignments, error: assignmentError } = await supabase
        .from('class_teachers')
        .select(`
            class_id,
            classes (
                id,
                name,
                grade,
                section,
                school_id
            )
        `)
        .eq('teacher_id', teacherId);

    if (assignmentError) {
        console.error('❌ Error fetching assignments:', assignmentError);
        return;
    }

    console.log(`✅ Found ${assignments?.length || 0} assigned classes in class_teachers`);

    const finalClasses: any[] = [];
    const classIds: string[] = [];

    (assignments || []).forEach((assignment: any) => {
        const c = assignment.classes;
        if (c) {
            finalClasses.push(c);
            classIds.push(c.id);
            console.log(`  - ${c.name} (Grade ${c.grade} ${c.section || ''})`);
        }
    });

    // 3. Total Students
    console.log('\n--- Fetching students for assigned classes ---');
    let studentCount = 0;
    if (classIds.length > 0) {
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('school_id', schoolId)
            .in('class_id', classIds);

        if (studentError) {
            console.error('❌ Error fetching students:', studentError);
        } else {
            studentCount = students?.length || 0;
            console.log(`✅ Found ${studentCount} total students in these classes`);
        }
    }

    console.log('\n--- FINAL STATS ---');
    console.log(`Teacher: ${teacherProfile.name}`);
    console.log(`Classes Taught: ${finalClasses.length}`);
    console.log(`Total Students: ${studentCount}`);
}

debugTeacherStats().catch(console.error);
