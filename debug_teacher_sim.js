
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugTeacherClasses() {
    console.log('--- Debugging Teacher Classes Logic ---');

    // 1. Find Teacher by Name
    console.log('Searching for teacher: Odupitan_Bisola');
    const { data: teachers, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .ilike('name', '%Bisola%');

    if (teacherError) {
        console.error('Error finding teacher:', teacherError);
        return;
    }

    if (!teachers || teachers.length === 0) {
        console.error('No teacher found with name like Bisola');
        return;
    }

    console.log(`Found ${teachers.length} teacher(s):`);
    teachers.forEach(t => console.log(`- ID: ${t.id}, Name: ${t.name}, School: ${t.school_id}`));

    const targetTeacher = teachers[0];
    const resolvedTeacherId = targetTeacher.id;
    console.log(`\nUsing Teacher ID: ${resolvedTeacherId}`);

    // 2. Fetch Assignments via class_teachers (Modern)
    console.log('\nFetching class_teachers (Modern)...');
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
        .eq('teacher_id', resolvedTeacherId);

    if (assignmentError) console.error('Error fetching class_teachers:', assignmentError);
    else {
        console.log(`Found ${assignments.length} assignments:`);
        assignments.forEach(a => {
            const c = a.classes;
            console.log(`- Class: ${c.name} (Grade: ${c.grade}, Section: ${c.section}, ID: ${c.id})`);
        });
    }

    // 3. Fetch Assignments via teacher_classes (Legacy)
    console.log('\nFetching teacher_classes (Legacy)...');
    const { data: legacyAssignments, error: legacyError } = await supabase
        .from('teacher_classes')
        .select('class_name')
        .eq('teacher_id', resolvedTeacherId);

    if (legacyError) console.error('Error fetching teacher_classes:', legacyError);
    else {
        console.log(`Found ${legacyAssignments.length} legacy assignments:`);
        legacyAssignments.forEach(l => console.log(`- Name: ${l.class_name}`));
    }

    // 4. Check for ANY teacher_classes entries for ANY teacher just to see
    // const { data: allLegacy } = await supabase.from('teacher_classes').select('teacher_id, class_name').limit(5);
    // console.log('\nSample of ANY teacher_classes:', allLegacy);

    console.log('--- End Debug ---');
}

debugTeacherClasses();
