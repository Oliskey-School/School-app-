
const { createClient } = require('@supabase/supabase-js');
try { require('dotenv').config(); } catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectDemoStudents() {
    console.log('--- Inspecting Demo Students ---');

    const { data: students, error } = await supabase
        .from('students')
        .select('id, name, school_generated_id, grade, section, email, school_id')
        .ilike('name', '%Demo Student%')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching students:', error);
        return;
    }

    console.log(`Found ${students.length} Demo Students.`);
    console.table(students.map(s => ({
        id: s.id,
        name: s.name,
        gen_id: s.school_generated_id,
        grade: s.grade,
        email: s.email
    })));

    // Check for Parent links
    if (students.length > 0) {
        const studentIds = students.map(s => s.id);
        const { data: links, error: linkError } = await supabase
            .from('parent_children')
            .select('parent_id, student_id')
            .in('student_id', studentIds);

        if (linkError) console.error('Error fetching parent links:', linkError);
        else {
            console.log('\nParent Links:');
            console.table(links);
        }
    }
}

inspectDemoStudents();
