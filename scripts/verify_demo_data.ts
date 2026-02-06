
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDemoData() {
    console.log('--- Verifying Demo Data ---');

    console.log('\n1. Checking Schools...');
    const { data: schools, error: schoolsError } = await supabase.from('schools').select('*');
    if (schoolsError) console.error('Error fetching schools:', schoolsError);
    else console.log(`Found ${schools.length} schools:`, schools.map(s => `${s.name} (${s.id})`));

    console.log('\n2. Checking Profiles (Demo Users)...');
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('email, role, school_id')
        .ilike('email', '%@demo.com');

    if (profilesError) console.error('Error fetching profiles:', profilesError);
    else {
        console.log(`Found ${profiles.length} demo profiles:`);
        profiles.forEach(p => console.log(`- ${p.email} | Role: ${p.role} | School: ${p.school_id}`));
    }

    console.log('\n3. Checking Role Tables...');

    const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
    console.log(`Total Students in 'students' table: ${studentCount}`);

    const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
    console.log(`Total Teachers in 'teachers' table: ${teacherCount}`);

    const { count: parentCount } = await supabase.from('parents').select('*', { count: 'exact', head: true });
    console.log(`Total Parents in 'parents' table: ${parentCount}`);

}

verifyDemoData();
