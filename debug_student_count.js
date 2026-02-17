
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugStudentCount() {
    console.log('--- Debugging Student Count Logic ---');

    // 1. Find Teacher by Name
    console.log('Searching for teacher: Odupitan_Bisola');
    const { data: teachers, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .ilike('name', '%Bisola%');

    if (teacherError || !teachers || teachers.length === 0) {
        console.error('Error finding teacher:', teacherError || 'No teacher found');
        return;
    }

    const resolvedTeacherId = teachers[0].id; // 43fed44d-94d7-49b4-b5f7-ab7aad3e3704
    console.log(`Using Teacher ID: ${resolvedTeacherId}`);

    // 2. Fetch Assignments via class_teachers
    console.log('\nFetching class_teachers...');
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

    if (assignmentError) {
        console.error('Error fetching assignments:', assignmentError);
        return;
    }

    const classes = assignments.map(a => a.classes).filter(c => c);
    console.log(`Found ${classes.length} assigned classes:`);
    classes.forEach(c => console.log(`- ${c.name} (Grade: ${c.grade}, Section: ${c.section}, ID: ${c.id})`));

    // 3. Replicate useTeacherStats logic
    console.log('\n--- Replicating Counting Logic ---');

    const classIds = classes.map(c => c.id);
    const grades = [...new Set(classes.map(c => c.grade))];

    console.log('Class IDs:', classIds);
    console.log('Grades to check:', grades);

    if (grades.length === 0) {
        console.log('No grades found, count is 0');
        return;
    }

    // Fetch all students in these grades
    const { data: studentsInGrades, error: studentsError } = await supabase
        .from('students')
        .select('id, name, current_class_id, grade, section')
        .in('grade', grades)
        .eq('status', 'Active');

    if (studentsError) {
        console.error('Error fetching students:', studentsError);
        return;
    }

    console.log(`\nFetched ${studentsInGrades.length} students in grades [${grades.join(', ')}]. Filtering...`);

    // Filter Logic
    const validStudents = studentsInGrades.filter(s => {
        // 1. Exact Class ID Match
        if (s.current_class_id && classIds.includes(s.current_class_id)) {
            console.log(`  [Match ID] ${s.name} (${s.id})`);
            return true;
        }

        // 2. Grade & Section Match
        const match = classes.some(c => {
            const gradeMatch = c.grade === s.grade;
            const classSection = (c.section || '').trim();
            const studentSection = (s.section || '').trim();

            // Logic: If class has NO section, it counts as "All Sections" for that grade
            // OR if class has section, it must match student section
            const sectionMatch = classSection === '' || classSection === studentSection;

            if (gradeMatch) {
                console.log(`    Comparing ${s.name} (G:${s.grade}, S:${studentSection}) vs Class ${c.name} (G:${c.grade}, S:${classSection}) -> GradeMatch:${gradeMatch}, SectionMatch:${sectionMatch}`);
            }

            return gradeMatch && sectionMatch;
        });

        if (match) {
            console.log(`  [Match Grade/Sec] ${s.name} (Grade: ${s.grade}, Sec: ${s.section})`);
            return true;
        }

        return false;
    });

    console.log(`\nTotal Valid Students Found: ${validStudents.length}`);
    validStudents.forEach(s => {
        console.log(`- ${s.name} [Grade: ${s.grade}, Section: ${s.section}, ClassID: ${s.current_class_id || 'NULL'}]`);
    });

    console.log('--- End Debug ---');
}

debugStudentCount();
