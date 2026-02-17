
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeacherAssignments() {
    const teacherEmail = 'demo_teacher@school.com';

    console.log('--- Teacher Profile ---');
    const { data: teacher, error: tError } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', teacherEmail)
        .single();

    if (tError) {
        console.error('Error fetching teacher:', tError);
        return;
    }
    console.log(JSON.stringify(teacher, null, 2));

    console.log('\n--- class_teachers (Modern Assignments) ---');
    const { data: classTeachers, error: ctError } = await supabase
        .from('class_teachers')
        .select('*, classes(*)')
        .eq('teacher_id', teacher.id);

    if (ctError) console.error('Error fetching class_teachers:', ctError);
    else console.log(JSON.stringify(classTeachers, null, 2));

    console.log('\n--- teacher_classes (Legacy Assignments) ---');
    const { data: teacherClasses, error: tcError } = await supabase
        .from('teacher_classes')
        .select('*')
        .eq('teacher_id', teacher.id);

    if (tcError) console.error('Error fetching teacher_classes:', tcError);
    else console.log(JSON.stringify(teacherClasses, null, 2));

    console.log('\n--- Recent Assignments (Homework/Classwork) ---');
    const { data: assignments, error: aError } = await supabase
        .from('assignments')
        .select('title, class_name, teacher_id')
        .eq('teacher_id', teacher.id)
        .limit(5);

    if (aError) console.error('Error fetching assignments:', aError);
    else console.log(JSON.stringify(assignments, null, 2));
}

checkTeacherAssignments();
