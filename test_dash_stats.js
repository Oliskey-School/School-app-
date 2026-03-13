const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function test() {
    const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

    let studentQuery = supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
    let teacherQuery = supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);

    const [students, teachers] = await Promise.all([
        studentQuery,
        teacherQuery
    ]);

    console.log('Students:', students.count, students.error);
    console.log('Teachers:', teachers.count, teachers.error);
}

test().catch(console.error);
